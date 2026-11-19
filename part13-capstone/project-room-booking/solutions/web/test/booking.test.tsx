// @vitest-environment jsdom
// 予約の画面のテスト（第69章 7節）。偽の API（fake-api.ts）を相手に、利用者と同じように名前で探して押す
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createQueryClient } from '../src/queryClient.ts';
import { routes } from '../src/routes.tsx';
import { createFakeApi, type FakeBooking } from './fake-api.ts';

// jsdom に無い EventSource の代わり。テストから知らせを送れるように、開いたものを覚えておく
class FakeEventSource {
  static last: FakeEventSource | null = null;
  readonly url: string;
  listeners = new Map<string, () => void>();
  constructor(url: string) {
    this.url = url;
    FakeEventSource.last = this;
  }
  addEventListener(type: string, fn: () => void) {
    this.listeners.set(type, fn);
  }
  close() {}
  emit(type: string) {
    this.listeners.get(type)?.();
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); // Date だけを止める（「今」を決める）
  vi.setSystemTime(new Date('2026-12-10T00:00:00Z')); // 日本では 12月10日（木）9:00
  vi.stubGlobal('EventSource', FakeEventSource);
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true; // jsdom には showModal・close が無い。開いているかを open で表すだけ
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false;
  };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  FakeEventSource.last = null;
});

/** 12月10日の、日本の時刻 hh:mm（UTC の ISO 8601） */
const at = (hm: string, date = '2026-12-10') => new Date(`${date}T${hm}:00+09:00`).toISOString();
const SEED: Omit<FakeBooking, 'id'>[] = [
  { roomId: 1, userId: 1, title: '定例', startsAt: at('10:00'), endsAt: at('11:00') }, // alice（自分）
  { roomId: 2, userId: 2, title: '1on1', startsAt: at('10:00'), endsAt: at('10:30') }, // bob
];

function setup(path: string, options: Parameters<typeof createFakeApi>[0] = {}) {
  const api = createFakeApi({ bookings: SEED, ...options });
  vi.stubGlobal('fetch', vi.fn(api.fetch));
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={createQueryClient({ retry: false })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  const where = () => router.state.location.pathname + router.state.location.search;
  const gets = (path: string) => api.calls.filter((c) => c.method === 'GET' && c.path === path).length;
  return { api, where, gets, user: userEvent.setup() };
}

/** 開いているダイアログ（閉じているものは数えない） */
const dialog = () => screen.getByRole('dialog');

describe('その日の予約（/）', () => {
  test('会議室 × 30 分の表。自分の予約には「（自分）」、ほかの人の予約は題名だけ。止めた会議室は出さない', async () => {
    setup('/');
    const table = await screen.findByRole('table');
    expect(screen.getByRole('heading', { level: 1, name: 'その日の予約' })).toBeTruthy();
    expect(screen.getByText('12/10（木）')).toBeTruthy();
    expect(within(table).getByRole('columnheader', { name: '会議室A（6人）' })).toBeTruthy();
    expect(within(table).queryByRole('columnheader', { name: /旧会議室/ })).toBeNull();
    // 10:00〜11:00 の予約は、2つの枠を1つのセルにまとめる
    const mine = within(table).getByRole('cell', { name: '定例（自分）' });
    expect(mine.getAttribute('rowspan')).toBe('2');
    expect(within(table).getByRole('cell', { name: '1on1' })).toBeTruthy();
    // 過ぎた枠（9:00 まで）はボタンにしない。これからの枠はボタン
    expect(screen.queryByRole('button', { name: '会議室A 08:30 から予約' })).toBeNull();
    expect(screen.queryByRole('button', { name: '会議室A 09:00 から予約' })).toBeNull();
    expect(screen.getByRole('button', { name: '会議室A 09:30 から予約' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '会議室A 10:30 から予約' })).toBeNull(); // 予約で埋まっている
  });

  test('空きを押して、題名と長さを選んで予約する。表に出て、知らせる', async () => {
    const { api, user } = setup('/');
    await user.click(await screen.findByRole('button', { name: '会議室B 14:00 から予約' }));
    expect(within(dialog()).getByRole('heading', { name: '会議室B 14:00 から予約' })).toBeTruthy();
    await user.type(within(dialog()).getByLabelText('題名'), '  設計レビュー ');
    await user.selectOptions(within(dialog()).getByLabelText('長さ'), '1 時間 30 分（〜15:30）');
    await user.click(within(dialog()).getByRole('button', { name: '予約する' }));

    expect(await screen.findByRole('cell', { name: '設計レビュー（自分）' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('会議室B 14:00〜15:30 を予約しました');
    const post = api.calls.find((c) => c.method === 'POST' && c.path === '/api/bookings');
    expect(post?.body).toEqual({ roomId: 2, title: '設計レビュー', startsAt: at('14:00'), endsAt: at('15:30') });
  });

  test('題名が空なら送らずに、その欄に理由を出す', async () => {
    const { api, user } = setup('/');
    await user.click(await screen.findByRole('button', { name: '会議室A 13:00 から予約' }));
    await user.click(within(dialog()).getByRole('button', { name: '予約する' }));
    expect(within(dialog()).getByText('題名を入れてください')).toBeTruthy();
    expect(within(dialog()).getByLabelText('題名').getAttribute('aria-invalid')).toBe('true');
    expect(api.calls.some((c) => c.method === 'POST')).toBe(false);
  });

  test('重なったら（409）、ダイアログの中に理由を出す。ダイアログは閉じない', async () => {
    const { api, user } = setup('/');
    await user.click(await screen.findByRole('button', { name: '会議室A 13:00 から予約' }));
    await user.type(within(dialog()).getByLabelText('題名'), '面談');
    api.failNext(409, 'その時間は、ほかの予約と重なっています'); // ほかの人が先に入れた
    await user.click(within(dialog()).getByRole('button', { name: '予約する' }));
    expect((await within(dialog()).findByRole('alert')).textContent).toBe('その時間は、ほかの予約と重なっています');
    expect(within(dialog()).getByLabelText('題名')).toHaveProperty('value', '面談');
  });

  test('長さは 21:00 までに終わるものだけ。キャンセルで閉じる', async () => {
    const { user } = setup('/');
    await user.click(await screen.findByRole('button', { name: '会議室A 20:00 から予約' }));
    const options = within(within(dialog()).getByLabelText('長さ')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['30 分（〜20:30）', '1 時間（〜21:00）']);
    await user.click(within(dialog()).getByRole('button', { name: 'キャンセル' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('前の日・次の日・今日。日付は URL に持つ。正しくない ?date= は今日', async () => {
    const { user, where, gets } = setup('/?date=2026-13-01');
    await screen.findByRole('table');
    expect(screen.getByText('12/10（木）')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '次の日 →' }));
    expect(where()).toBe('/?date=2026-12-11');
    expect(await screen.findByText('12/11（金）')).toBeTruthy();
    await waitFor(() => expect(gets('/api/bookings?date=2026-12-11')).toBe(1));
    // 次の日は、過ぎた枠が無い
    expect(await screen.findByRole('button', { name: '会議室A 08:00 から予約' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '今日' }));
    expect(where()).toBe('/');
    expect(screen.getByRole('button', { name: '今日' })).toHaveProperty('disabled', true);
  });

  test('SSE で知らせが来たら、表を読み直す（ほかの人の予約が出る）', async () => {
    const { api, gets } = setup('/');
    await screen.findByRole('table');
    expect(FakeEventSource.last?.url).toBe('/api/events');
    api.addBookingByOther({ roomId: 1, title: '来客', startsAt: at('16:00'), endsAt: at('17:00') });
    FakeEventSource.last?.emit('booking.created');
    expect(await screen.findByRole('cell', { name: '来客' })).toBeTruthy();
    expect(gets('/api/bookings?date=2026-12-10')).toBe(2);
  });
});

describe('自分の予約（/mine）', () => {
  test('自分の予約だけを出す。確かめてから取り消す', async () => {
    const { api, user } = setup('/mine');
    const item = await screen.findByText(/「定例」/);
    expect(item.textContent).toContain('12/10（木） 10:00〜11:00 会議室A 「定例」');
    expect(screen.queryByText(/1on1/)).toBeNull();

    await user.click(screen.getByRole('button', { name: '「定例」を取り消す' }));
    expect(within(dialog()).getByRole('heading', { name: '予約を取り消しますか？' })).toBeTruthy();
    expect(document.activeElement?.textContent).toBe('キャンセル'); // うっかり決めないように
    await user.click(within(dialog()).getByRole('button', { name: '取り消す' }));
    expect(await screen.findByText('これからの予約はありません。')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('予約を取り消しました');
    expect(api.calls.some((c) => c.method === 'DELETE' && c.path === '/api/bookings/1')).toBe(true);
  });
});

describe('会議室の管理（/admin/rooms）', () => {
  test('管理者でなければ、メニューに出さず、開いても使えない', async () => {
    const { api } = setup('/admin/rooms');
    expect(await screen.findByText('このページは管理者だけが使えます。')).toBeTruthy();
    expect(screen.queryByRole('link', { name: '会議室の管理' })).toBeNull();
    expect(api.calls.some((c) => c.path.startsWith('/api/rooms'))).toBe(false);
  });

  test('管理者は、止めた会議室も含めて一覧し、足す・変えるができる', async () => {
    const { api, user } = setup('/admin/rooms', { as: 'admin' });
    expect(await screen.findByRole('link', { name: '会議室の管理' })).toBeTruthy();
    expect(await screen.findByLabelText('旧会議室 の名前')).toBeTruthy();
    expect(screen.getByLabelText('旧会議室 を使える')).toHaveProperty('checked', false);

    // 使えるようにして保存
    await user.click(screen.getByLabelText('旧会議室 を使える'));
    await user.click(screen.getByRole('button', { name: '旧会議室 を保存' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('旧会議室 を保存しました'));
    const patch = api.calls.find((c) => c.method === 'PATCH');
    expect(patch).toMatchObject({ path: '/api/rooms/3', body: { name: '旧会議室', capacity: 8, active: true } });

    // 足す。定員が数でなければ送らない。名前が重なれば（409）、名前の欄に出す
    const form = screen.getByRole('heading', { name: '会議室を足す' }).closest('form');
    if (form === null) throw new Error('フォームがありません');
    await user.type(within(form).getByLabelText('名前'), '会議室A');
    await user.type(within(form).getByLabelText('定員'), '十');
    await user.click(within(form).getByRole('button', { name: '足す' }));
    expect(within(form).getByText('定員は 1〜100 の数です')).toBeTruthy();
    await user.clear(within(form).getByLabelText('定員'));
    await user.type(within(form).getByLabelText('定員'), '10');
    await user.click(within(form).getByRole('button', { name: '足す' }));
    expect(await within(form).findByText('その名前の会議室は、もうあります')).toBeTruthy();
    await user.clear(within(form).getByLabelText('名前'));
    await user.type(within(form).getByLabelText('名前'), '会議室C');
    await user.click(within(form).getByRole('button', { name: '足す' }));
    expect(await screen.findByLabelText('会議室C の名前')).toBeTruthy();
    expect(within(form).getByLabelText('名前')).toHaveProperty('value', '');
  });
});
