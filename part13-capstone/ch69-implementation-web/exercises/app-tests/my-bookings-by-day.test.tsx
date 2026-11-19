// @vitest-environment jsdom
// 第69章 練習問題7 のテスト（仕様）: 自分の予約を、日付ごとの見出しと一覧に分ける
// ~/dev/room-booking/web/test/ にコピーして動かす（fake-api.ts と画面の src/ を import するため）
//   $ cp （このファイル） ~/dev/room-booking/web/test/
//   $ cd ~/dev/room-booking/web && npx vitest run test/my-bookings-by-day.test.tsx
// 書く前は、日付の見出しが無いので 4 個のうち 3 個が失敗する
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createQueryClient } from '../src/queryClient.ts';
import { routes } from '../src/routes.tsx';
import { createFakeApi, type FakeBooking } from './fake-api.ts';

// jsdom に無いもの（EventSource・dialog）の代わり。booking.test.tsx と同じ
class FakeEventSource {
  addEventListener() {}
  close() {}
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-12-10T00:00:00Z')); // 日本では 12月10日（木）9:00
  vi.stubGlobal('EventSource', FakeEventSource);
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false;
  };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const at = (date: string, hm: string) => new Date(`${date}T${hm}:00+09:00`).toISOString();
const booking = (date: string, s: string, e: string, title: string, userId = 1): Omit<FakeBooking, 'id'> => ({
  roomId: 1,
  userId,
  title,
  startsAt: at(date, s),
  endsAt: at(date, e),
});

function setup(bookings: Omit<FakeBooking, 'id'>[]) {
  const api = createFakeApi({ bookings });
  vi.stubGlobal('fetch', vi.fn(api.fetch));
  const router = createMemoryRouter(routes, { initialEntries: ['/mine'] });
  render(
    <QueryClientProvider client={createQueryClient({ retry: false })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup() };
}

/** 一覧の項目の文字（「取り消す」のボタンの文字は除く） */
const itemsOf = (list: HTMLElement) =>
  within(list)
    .getAllByRole('listitem')
    .map((li) => (li.textContent ?? '').replace('取り消す', '').trim());

test('日付ごとに見出し（h2）を出す。日付は早い順', async () => {
  setup([
    booking('2026-12-11', '10:00', '11:00', '週次'),
    booking('2026-12-10', '14:00', '15:00', '定例'),
    booking('2026-12-10', '10:00', '11:00', '朝会'),
  ]);
  await screen.findByRole('heading', { level: 2, name: '12/10（木）' });
  expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
    '12/10（木）',
    '12/11（金）',
  ]);
});

test('見出しの下に、その日の予約の一覧。一覧の名前は見出し。行には日付を書かない', async () => {
  setup([
    booking('2026-12-10', '14:00', '15:00', '定例'),
    booking('2026-12-10', '10:00', '11:00', '朝会'),
    booking('2026-12-10', '11:00', '12:00', '1on1', 2), // bob の予約は出ない
    booking('2026-12-11', '10:00', '11:00', '週次'),
  ]);
  const day10 = await screen.findByRole('list', { name: '12/10（木）' });
  expect(itemsOf(day10)).toEqual(['10:00〜11:00 会議室A 「朝会」', '14:00〜15:00 会議室A 「定例」']);
  expect(itemsOf(screen.getByRole('list', { name: '12/11（金）' }))).toEqual(['10:00〜11:00 会議室A 「週次」']);
});

test('その日の最後の予約を取り消すと、その日の見出しも消える', async () => {
  const { user } = setup([
    booking('2026-12-10', '10:00', '11:00', '朝会'),
    booking('2026-12-11', '10:00', '11:00', '週次'),
  ]);
  await user.click(await screen.findByRole('button', { name: '「朝会」を取り消す' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '取り消す' }));
  await vi.waitFor(() => expect(screen.queryByRole('heading', { level: 2, name: '12/10（木）' })).toBeNull());
  expect(screen.getByRole('heading', { level: 2, name: '12/11（金）' })).toBeTruthy();
});

test('予約が無ければ、見出しも一覧も無く「これからの予約はありません。」', async () => {
  setup([]);
  expect(await screen.findByText('これからの予約はありません。')).toBeTruthy();
  expect(screen.queryAllByRole('heading', { level: 2 })).toEqual([]);
});
