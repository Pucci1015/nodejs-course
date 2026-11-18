// 追加（第11部）: 第10部の成果物の 4.2節（手で確かめた通しの流れ）を、自動にした E2E
// 画面 → Vite の中継 → API → PostgreSQL、API → 偽の SMTP サーバ、の全部を本物のまま通す
// 変更（第12部）: 画面は Vite の中継ではなく、ビルドしたものを API が配る（playwright.config.ts）。テストの中身は第11部のまま
// 動かし方: npm run e2e（playwright.config.ts が3つのサーバを起動する）
import { expect, test } from '@playwright/test';
import { PASSWORD, WEB_ORIGIN, linkIn, newEmail, signUpByApi, waitForMail } from './helpers.ts';

test('登録 → 確認のメールのリンク → ログイン → タスクを作る → ログアウト', async ({ page, request }) => {
  const email = newEmail('alice');

  // 登録する
  await page.goto('/register');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill(PASSWORD);
  await page.getByRole('button', { name: '登録する' }).click();
  await expect(page.getByText(`${email} にメールを送りました`)).toBeVisible();

  // 届いたメールのリンクを開いて、確かめる（開いただけでは確かめない。ボタンを押す）
  const mail = await waitForMail(request, email, 'メールアドレスの確認');
  await page.goto(linkIn(mail));
  await expect(page.getByRole('heading', { level: 1, name: 'メールアドレスの確認' })).toBeVisible();
  await page.getByRole('button', { name: 'メールアドレスを確かめる' }).click();
  await expect(page.getByText('確認できました')).toBeVisible();

  // ログインのページへ移り、ログインする
  await page.getByRole('main').getByRole('link', { name: 'ログイン' }).click();
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill(PASSWORD);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'タスク一覧' })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  // タスクを作ると、そのタスクのページに移る。一覧にも出る
  await page.getByRole('link', { name: '新しいタスク', exact: true }).click();
  // 移り終わるのを見出しで待つ。一覧のページにも「題名…」のラベルがあるので、待たずに探すと、そちらが見つかる
  await expect(page.getByRole('heading', { level: 1, name: '新しいタスク' })).toBeVisible();
  await page.getByRole('textbox', { name: '題名', exact: true }).fill('牛乳を買う');
  await page.getByRole('button', { name: '作る' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '牛乳を買う' })).toBeVisible();
  await page.getByRole('link', { name: '一覧' }).click();
  await expect(page.getByRole('link', { name: '牛乳を買う' })).toBeVisible();

  // ログアウトすると、ログインのページに移る。タスクのページはもう開けない
  await page.getByRole('button', { name: 'ログアウト' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'ログイン' })).toBeVisible();
  await page.goto('/');
  await expect(page).toHaveURL(/\/login\?next=/);
});

test('別の人のタスクは、一覧にも、そのタスクのページにも出ない', async ({ page, request }) => {
  // 準備: alice を API で登録して、タスクを1つ作る（画面の登録は、上のテストで確かめてある）
  const alice = newEmail('alice');
  await signUpByApi(request, alice);
  const headers = { origin: WEB_ORIGIN };
  expect(
    (await request.post('/api/auth/login', { headers, data: { email: alice, password: PASSWORD } })).status(),
  ).toBe(204);
  const created = await request.post('/api/tasks', { headers, data: { title: 'alice だけのタスク' } });
  expect(created.status()).toBe(201);
  const { id } = (await created.json()) as { id: number };

  // bob が画面からログインする
  const bob = newEmail('bob');
  await signUpByApi(request, bob);
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(bob);
  await page.getByLabel('パスワード').fill(PASSWORD);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'タスク一覧' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'alice だけのタスク' })).toHaveCount(0);

  // URL を直接開いても、見つからない
  await page.goto(`/tasks/${id}`);
  await expect(page.getByRole('heading', { level: 1, name: 'ページが見つかりません' })).toBeVisible();
  await expect(page.getByText('alice だけのタスク')).toHaveCount(0);
});
