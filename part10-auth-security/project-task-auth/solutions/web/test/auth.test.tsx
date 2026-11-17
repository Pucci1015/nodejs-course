// @vitest-environment jsdom
// 追加（第10部）: ログイン・登録・確認・再設定の画面のテスト。偽の API（fake-api.ts）の /api/auth/… を相手にする
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createQueryClient } from '../src/queryClient.ts';
import { routes } from '../src/routes.tsx';
import { createFakeApi, PASSWORD, RESET_TOKEN, VERIFY_TOKEN, type FakeTask } from './fake-api.ts';

class FakeEventSource {
  addEventListener() {}
  close() {}
}
beforeEach(() => {
  vi.stubGlobal('EventSource', FakeEventSource);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup(path: string, { loggedIn = false, seed = [] }: { loggedIn?: boolean; seed?: Partial<FakeTask>[] } = {}) {
  const api = createFakeApi(seed, { loggedIn });
  vi.stubGlobal('fetch', vi.fn(api.fetch));
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={createQueryClient({ retry: false })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  const where = () => router.state.location.pathname + router.state.location.search;
  return { api, router, where, user: userEvent.setup() };
}

/** API に送った POST のうち、path のもの */
const posts = (api: ReturnType<typeof createFakeApi>, path: string) => api.calls.filter((c) => c.method === 'POST' && c.path === path);

describe('ログイン（/login）', () => {
  test('ログインしていなければ、ログインのページへ。ログインすると、開こうとしたページへ戻る', async () => {
    const { user, where } = setup('/tasks/1', { seed: [{ title: '牛乳を買う' }] });
    await screen.findByRole('heading', { level: 1, name: 'ログイン' });
    expect(where()).toBe('/login?next=%2Ftasks%2F1');
    expect(screen.getByRole('link', { name: 'ログイン' })).toBeTruthy(); // メニューも「ログインしていない」のもの
    expect(screen.queryByRole('link', { name: '新しいタスク' })).toBeNull();

    await user.type(screen.getByLabelText('メールアドレス'), 'alice@example.com');
    await user.type(screen.getByLabelText('パスワード'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'ログイン' }));
    expect(await screen.findByRole('heading', { level: 1, name: '牛乳を買う' })).toBeTruthy();
    expect(where()).toBe('/tasks/1');
    expect(screen.getByText('alice@example.com')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeTruthy();
  });

  test('パスワードが違えば、その場に理由を出す。入れた値は消さない', async () => {
    const { user } = setup('/login');
    await user.type(await screen.findByLabelText('メールアドレス'), 'alice@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'wrong-password-123');
    await user.click(screen.getByRole('button', { name: 'ログイン' }));
    expect((await screen.findByRole('alert')).textContent).toBe('メールアドレスかパスワードが違います');
    expect(screen.getByLabelText('メールアドレス')).toHaveProperty('value', 'alice@example.com');
  });

  test('確認がまだなら、確認のメールを送り直せる', async () => {
    const { user, api } = setup('/login');
    await user.type(await screen.findByLabelText('メールアドレス'), 'carol@example.com');
    await user.type(screen.getByLabelText('パスワード'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'ログイン' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('メールアドレスの確認がまだです');
    await user.click(within(alert).getByRole('button', { name: '確認のメールを送り直す' }));
    await waitFor(() => expect(posts(api, '/api/auth/resend-verification')).toHaveLength(1));
    expect(posts(api, '/api/auth/resend-verification')[0]?.body).toEqual({ email: 'carol@example.com', password: PASSWORD });
  });

  test.each([
    ['//evil.example/x', '/'],
    ['https://evil.example/', '/'],
    ['/tasks/new', '/tasks/new'],
  ])('?next=%s なら、ログインの後は %s へ（このサイトの中だけ）', async (next, expected) => {
    const { user, where } = setup(`/login?next=${encodeURIComponent(next)}`);
    await user.type(await screen.findByLabelText('メールアドレス'), 'alice@example.com');
    await user.type(screen.getByLabelText('パスワード'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'ログイン' }));
    await waitFor(() => expect(where()).toBe(expected));
  });

  test('IdP から ?error=conflict で戻ってきたら、理由を出す', async () => {
    setup('/login?error=conflict');
    expect((await screen.findByRole('alert')).textContent).toContain('同じメールアドレスのアカウントがあります');
  });
});

describe('ログアウトとセッション切れ', () => {
  test('ログアウトすると、ログインのページへ。前の人のタスクは、キャッシュから消える', async () => {
    const { user, api, router } = setup('/', { loggedIn: true, seed: [{ title: '牛乳を買う' }] });
    await screen.findByRole('link', { name: '牛乳を買う' });
    await user.click(screen.getByRole('button', { name: 'ログアウト' }));
    await screen.findByRole('heading', { level: 1, name: 'ログイン' });
    expect(posts(api, '/api/auth/logout')).toHaveLength(1);
    // 戻るボタンで一覧に戻っても、前の人のタスクは出ない（ログインのページへ送られる）
    await router.navigate('/');
    await screen.findByRole('heading', { level: 1, name: 'ログイン' });
    expect(screen.queryByText('牛乳を買う')).toBeNull();
  });

  test('途中でセッションが切れたら（API が 401）、ログインのページへ', async () => {
    const { user, api, where } = setup('/tasks/new', { loggedIn: true });
    await user.type(await screen.findByLabelText('題名'), '本を返す');
    api.expireSession();
    await user.click(screen.getByRole('button', { name: '作る' }));
    await screen.findByRole('heading', { level: 1, name: 'ログイン' });
    expect(where()).toBe('/login?next=%2Ftasks%2Fnew');
  });
});

describe('登録（/register）', () => {
  test('パスワードが決まりに合わなければ、その欄に API の理由を出す', async () => {
    const { user } = setup('/register');
    await user.type(await screen.findByLabelText('メールアドレス'), 'bob@example.com');
    await user.type(screen.getByLabelText('パスワード'), 'short');
    await user.click(screen.getByRole('button', { name: '登録する' }));
    const input = screen.getByLabelText('パスワード');
    await waitFor(() => expect(input.getAttribute('aria-invalid')).toBe('true'));
    expect(input.getAttribute('aria-describedby')).toContain('-error');
    expect(screen.getByText('パスワードは 12 文字以上にしてください')).toBeTruthy();
  });

  test('送れたら「メールを送りました」を出す', async () => {
    const { user } = setup('/register');
    await user.type(await screen.findByLabelText('メールアドレス'), 'bob@example.com');
    await user.type(screen.getByLabelText('パスワード'), PASSWORD);
    await user.click(screen.getByRole('button', { name: '登録する' }));
    expect(await screen.findByText(/bob@example.com にメールを送りました/)).toBeTruthy();
  });
});

describe('メールのリンク', () => {
  test('/verify-email: 開いただけでは送らない。ボタンで確かめる', async () => {
    const { user, api } = setup(`/verify-email#token=${VERIFY_TOKEN}`);
    const button = await screen.findByRole('button', { name: 'メールアドレスを確かめる' });
    expect(posts(api, '/api/auth/verify-email')).toHaveLength(0);
    await user.click(button);
    expect(await screen.findByText(/確認できました/)).toBeTruthy();
    expect(posts(api, '/api/auth/verify-email')[0]?.body).toEqual({ token: VERIFY_TOKEN });
  });

  test('/verify-email: 使えないトークンなら理由を出す。トークンが無ければボタンも出さない', async () => {
    const { user } = setup(`/verify-email#token=${'x'.repeat(43)}`);
    await user.click(await screen.findByRole('button', { name: 'メールアドレスを確かめる' }));
    expect((await screen.findByRole('alert')).textContent).toContain('期限が切れています');
    cleanup();
    setup('/verify-email');
    expect((await screen.findByRole('alert')).textContent).toContain('リンクが正しくありません');
    expect(screen.queryByRole('button', { name: 'メールアドレスを確かめる' })).toBeNull();
  });

  test('/reset-password: 新しいパスワードにする', async () => {
    const { user, api } = setup(`/reset-password#token=${RESET_TOKEN}`);
    await user.type(await screen.findByLabelText('新しいパスワード'), 'short');
    await user.click(screen.getByRole('button', { name: 'パスワードを変える' }));
    expect(await screen.findByText('パスワードは 12 文字以上にしてください')).toBeTruthy();
    await user.clear(screen.getByLabelText('新しいパスワード'));
    await user.type(screen.getByLabelText('新しいパスワード'), 'new-purple-otter-92');
    await user.click(screen.getByRole('button', { name: 'パスワードを変える' }));
    expect(await screen.findByText(/パスワードを変えました/)).toBeTruthy();
    expect(posts(api, '/api/auth/reset-password').at(-1)?.body).toEqual({ token: RESET_TOKEN, password: 'new-purple-otter-92' });
  });

  test('/forgot-password: 送れたら、登録されているかに関係なく同じ文を出す', async () => {
    const { user } = setup('/forgot-password');
    await user.type(await screen.findByLabelText('メールアドレス'), 'nobody@example.com');
    await user.click(screen.getByRole('button', { name: '再設定のメールを送る' }));
    expect(await screen.findByText(/nobody@example.com が登録されていれば/)).toBeTruthy();
  });
});
