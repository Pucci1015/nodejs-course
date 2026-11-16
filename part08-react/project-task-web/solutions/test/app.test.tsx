// @vitest-environment jsdom
// 画面全体のテスト。偽の API（fake-api.ts）を fetch の代わりに置き、利用者と同じように、名前で探して押す
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { routes } from '../src/routes.tsx';
import { createFakeApi, type FakeTask } from './fake-api.ts';

// jsdom に無いものを足す
class FakeEventSource {
  addEventListener() {}
  close() {}
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); // Date だけを止める（「今日」を決める）
  vi.setSystemTime(new Date('2026-12-10T03:00:00Z')); // 日本では 12月10日 12時
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
});

function setup(path: string, seed: Partial<FakeTask>[] = []) {
  const api = createFakeApi(seed);
  vi.stubGlobal('fetch', vi.fn(api.fetch));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { api, router, user: userEvent.setup() };
}

const status = () => screen.getByRole('status');

describe('一覧（/）', () => {
  test('タスクを、詳しい画面へのリンクで並べる。締め切りの残りの日数も出す', async () => {
    setup('/', [
      { title: '牛乳を買う', dueDate: '2026-12-10' },
      { title: '本を返す', dueDate: '2026-12-08' },
      { title: '部屋の掃除' },
    ]);
    expect(await screen.findByRole('link', { name: '牛乳を買う' })).toHaveProperty('pathname', '/tasks/1');
    expect(screen.getByRole('heading', { level: 1, name: 'タスク一覧' })).toBeTruthy();
    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => within(li).getByRole('link').textContent)).toEqual(['本を返す', '牛乳を買う', '部屋の掃除']); // 締め切りが近い順
    expect(within(items[0]!).getByText('2 日過ぎています')).toBeTruthy();
    expect(within(items[1]!).getByText('今日まで')).toBeTruthy();
  });

  test('タスクが無ければ「タスクはありません」', async () => {
    setup('/');
    expect(await screen.findByText('タスクはありません')).toBeTruthy();
  });

  test('状態と並べ方を変えると、URL に入り、その条件で読み直す', async () => {
    const { api, router, user } = setup('/', [{ title: 'A', status: 'done' }, { title: 'B' }, { title: 'C', status: 'done' }]);
    await screen.findByRole('link', { name: 'A' });
    await user.click(screen.getByRole('checkbox', { name: '完了' }));
    await user.selectOptions(screen.getByRole('combobox', { name: '並べ方' }), '題名順');
    await waitFor(() => expect(router.state.location.search).toBe('?status=done&sort=title'));
    await waitFor(() => expect(screen.queryByRole('link', { name: 'B' })).toBeNull());
    expect(api.calls.at(-1)?.path).toBe('/api/tasks?status=done&sort=title&limit=20');
  });

  test('URL の条件で開ける（知らない値は捨てる）', async () => {
    const { api } = setup('/?status=doing,xyz&sort=nope', [{ title: 'A', status: 'doing' }, { title: 'B' }]);
    await screen.findByRole('link', { name: 'A' });
    expect(screen.queryByRole('link', { name: 'B' })).toBeNull();
    expect(api.calls[0]?.path).toBe('/api/tasks?status=doing&sort=dueDate&limit=20');
    expect(screen.getByRole('checkbox', { name: '作業中' })).toHaveProperty('checked', true);
  });

  test('20 件より多ければ「もっと読む」で続きを足す', async () => {
    const { user } = setup('/', Array.from({ length: 25 }, (_, i) => ({ title: `t${String(i + 1).padStart(2, '0')}` })));
    await screen.findByRole('link', { name: 't01' });
    expect(screen.getAllByRole('listitem')).toHaveLength(20);
    await user.click(screen.getByRole('button', { name: 'もっと読む' }));
    await screen.findByRole('link', { name: 't25' });
    expect(screen.getAllByRole('listitem')).toHaveLength(25);
    expect(screen.queryByRole('button', { name: 'もっと読む' })).toBeNull();
  });

  test('題名で絞り込む（読み込んだものの中から。大文字と小文字は区別しない）', async () => {
    const { user } = setup('/', [{ title: 'Buy milk' }, { title: '本を返す' }]);
    await screen.findByRole('link', { name: 'Buy milk' });
    await user.type(screen.getByRole('searchbox', { name: '題名で絞り込む' }), 'MILK');
    await waitFor(() => expect(screen.queryByRole('link', { name: '本を返す' })).toBeNull());
    expect(screen.getByRole('link', { name: 'Buy milk' })).toBeTruthy();
  });

  test('チェックで完了にし、知らせる', async () => {
    const { api, user } = setup('/', [{ title: '牛乳を買う' }]);
    await user.click(await screen.findByRole('checkbox', { name: '完了（牛乳を買う）' }));
    expect(screen.getByRole('checkbox', { name: '完了（牛乳を買う）' })).toHaveProperty('checked', true); // すぐに変わる
    await waitFor(() => expect(status().textContent).toBe('「牛乳を買う」を完了にしました'));
    expect(api.tasks.get(1)?.status).toBe('done');
    expect(api.calls.find((c) => c.method === 'PATCH')?.headers.get('If-Match')).toBe('"1"');
  });

  test('完了にできなければ、チェックを戻して、理由を出す', async () => {
    const { api, user } = setup('/', [{ title: '牛乳を買う' }]);
    const box = await screen.findByRole('checkbox', { name: '完了（牛乳を買う）' });
    api.failNext(409, '今は変えられません');
    await user.click(box);
    expect((await screen.findByRole('alert')).textContent).toContain('今は変えられません');
    await waitFor(() => expect(screen.getByRole('checkbox', { name: '完了（牛乳を買う）' })).toHaveProperty('checked', false));
  });
});

describe('新しいタスク（/tasks/new）', () => {
  test('題名が空なら送らず、題名の横に理由を出す', async () => {
    const { api, user } = setup('/tasks/new');
    await user.click(await screen.findByRole('button', { name: '作る' }));
    const title = screen.getByRole('textbox', { name: '題名' });
    expect(title.getAttribute('aria-invalid')).toBe('true');
    expect(title.getAttribute('aria-describedby')).toBeTruthy();
    expect(document.getElementById(title.getAttribute('aria-describedby')!)?.textContent).toBe('題名を入れてください');
    expect(api.calls.some((c) => c.method === 'POST')).toBe(false);
  });

  test('作れたら、そのタスクの画面に移り、知らせる。冪等キーを付けて送る', async () => {
    const { api, router, user } = setup('/tasks/new');
    await user.type(await screen.findByRole('textbox', { name: '題名' }), '  牛乳を買う ');
    await user.click(screen.getByRole('button', { name: '作る' }));
    expect(await screen.findByRole('heading', { level: 1, name: '牛乳を買う' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/tasks/1');
    expect(status().textContent).toBe('「牛乳を買う」を作りました');
    const post = api.calls.find((c) => c.method === 'POST');
    expect(post?.body).toEqual({ title: '牛乳を買う', dueDate: null });
    expect(post?.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('サーバが 422 を返したら、その項目の横に出す', async () => {
    const { user } = setup('/tasks/new');
    await user.type(await screen.findByRole('textbox', { name: '題名' }), '本を返す');
    await user.type(screen.getByLabelText('締め切り'), '2026-12-01');
    await user.click(screen.getByRole('button', { name: '作る' }));
    await waitFor(() => expect(screen.getByLabelText('締め切り').getAttribute('aria-invalid')).toBe('true'));
    expect(screen.getByText('締め切りが過ぎています')).toBeTruthy();
  });
});

describe('タスクの画面（/tasks/:id）', () => {
  const seed = [{ title: '牛乳を買う', dueDate: '2026-12-20' }];

  test('題名を直すと、変わった項目だけを送る', async () => {
    const { api, user } = setup('/tasks/1', seed);
    const title = await screen.findByRole('textbox', { name: '題名' });
    await user.clear(title);
    await user.type(title, '豆乳を買う');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(await screen.findByRole('heading', { level: 1, name: '豆乳を買う' })).toBeTruthy();
    expect(api.calls.find((c) => c.method === 'PATCH')?.body).toEqual({ title: '豆乳を買う' });
    expect(status().textContent).toBe('「豆乳を買う」を保存しました');
  });

  test('ほかの人が先に変えていたら（412）、「読み直す」で新しい中身にする', async () => {
    const { api, user } = setup('/tasks/1', seed);
    const title = await screen.findByRole('textbox', { name: '題名' });
    api.changeByOther(1, '牛乳を2本買う');
    await user.type(title, '！');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect((await screen.findByRole('alert')).textContent).toContain('ほかの人が先に変えました');
    await user.click(screen.getByRole('button', { name: '読み直す' }));
    expect(await screen.findByRole('heading', { level: 1, name: '牛乳を2本買う' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: '題名' })).toHaveProperty('value', '牛乳を2本買う');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('状態を変える。断られたら（409）理由を出す', async () => {
    const { user } = setup('/tasks/4', [{ status: 'doing' }, { status: 'doing' }, { status: 'doing' }, { title: '本を返す' }]);
    const select = await screen.findByRole('combobox', { name: '状態' });
    await user.selectOptions(select, '作業中');
    expect((await screen.findByRole('alert')).textContent).toContain('作業中のタスクは 3 個までです');
    expect(screen.getByRole('combobox', { name: '状態' })).toHaveProperty('value', 'todo');
    await user.selectOptions(screen.getByRole('combobox', { name: '状態' }), '完了');
    await waitFor(() => expect(screen.getByRole('combobox', { name: '状態' })).toHaveProperty('value', 'done'));
  });

  test('「消す」は確かめてから消し、一覧に戻って知らせる', async () => {
    const { api, router, user } = setup('/tasks/1', seed);
    await user.click(await screen.findByRole('button', { name: '消す' }));
    const dialog = screen.getByRole('dialog', { name: '「牛乳を買う」を消しますか' });
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'キャンセル' }));
    await user.click(within(dialog).getByRole('button', { name: '消す' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'タスク一覧' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/');
    expect(status().textContent).toBe('「牛乳を買う」を消しました');
    expect(api.tasks.size).toBe(0);
  });

  test.each(['/tasks/99', '/tasks/abc', '/nothing'])('%s は「ページが見つかりません」', async (path) => {
    setup(path, seed);
    expect(await screen.findByRole('heading', { level: 1, name: 'ページが見つかりません' })).toBeTruthy();
  });
});

describe('枠', () => {
  test('「本文へ」のリンクと、メニューがある。ページが替わったら見出しにフォーカスを移す', async () => {
    const { user } = setup('/', [{ title: '牛乳を買う' }]);
    expect(screen.getByRole('link', { name: '本文へ' }).getAttribute('href')).toBe('#main');
    const nav = screen.getByRole('navigation', { name: 'メニュー' });
    expect(within(nav).getByRole('link', { name: '一覧' }).getAttribute('aria-current')).toBe('page');
    await user.click(await screen.findByRole('link', { name: '牛乳を買う' }));
    const h1 = await screen.findByRole('heading', { level: 1, name: '牛乳を買う' });
    await waitFor(() => expect(document.activeElement).toBe(h1));
  });
});
