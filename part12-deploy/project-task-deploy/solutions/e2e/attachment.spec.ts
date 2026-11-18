// 追加（第12部）: 画像を添付する通しの流れ。画面 → API → 練習用の S3（署名付き URL）を、本物のまま通す
// 画面は、ビルドした web/dist を API が配っている（本番と同じ形。CSP も本番と同じ helmet の設定）
import { expect, test } from '@playwright/test';
import { PASSWORD, WEB_ORIGIN, newEmail, signUpByApi } from './helpers.ts';

/** 2×2 の PNG を作る（中身は本物の画像） */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mP8z8DwnwEJMDEgAUYGBgAZlgIBvuX1HAAAAABJRU5ErkJggg==',
  'base64',
);

test('画像を添付すると表示され、消すと消える', async ({ page, request }) => {
  const email = newEmail('alice');
  await signUpByApi(request, email);

  // 画面からログインして、タスクを作る
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill(PASSWORD);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'タスク一覧' })).toBeVisible();
  await page.getByRole('link', { name: '新しいタスク', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: '新しいタスク' })).toBeVisible();
  await page.getByRole('textbox', { name: '題名', exact: true }).fill('壁の写真を撮る');
  await page.getByRole('button', { name: '作る' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '壁の写真を撮る' })).toBeVisible();
  await expect(page.getByText('添付ファイルはありません')).toBeVisible();

  // CSP に違反したら、ブラウザがコンソールに書く。それを集めておく
  const violations: string[] = [];
  page.on('console', (m) => {
    if (m.text().includes('Content Security Policy')) violations.push(m.text());
  });

  // 画像を選ぶ。名前は ASCII にする（執筆の環境の Chromium のヘッドレス版は、日本語の filename* を読まず
  // 「download」という名前にした。日本語の名前の Content-Disposition は、test/http/deploy.test.ts の 46 で確かめてある）
  await page.getByLabel('画像を添付').setInputFiles({ name: 'wall.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('status')).toHaveText('「wall.png」を添付しました');
  const img = page.getByRole('img', { name: 'wall.png' });
  await expect(img).toBeVisible();
  // 画像が本当に読み込めた（302 で署名付き URL へ移り、ストレージから読んだ）。naturalWidth は画像の本当の幅
  // （このファイルは DOM の型を読まない設定なので、Reflect.get で読む）
  await expect.poll(() => img.evaluate((el) => Number(Reflect.get(el, 'naturalWidth')))).toBe(2);
  expect(violations).toEqual([]);

  // ダウンロードのリンクは、名前を付けて保存させる
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'wall.png' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('wall.png');

  // 消す
  await page.getByRole('button', { name: 'wall.png を消す' }).click();
  await expect(page.getByRole('status')).toHaveText('「wall.png」を消しました');
  await expect(page.getByText('添付ファイルはありません')).toBeVisible();
});

test('ほかの人の添付ファイルの URL は、ログインしていても 404', async ({ request, browser }) => {
  const alice = newEmail('alice');
  await signUpByApi(request, alice);
  const headers = { origin: WEB_ORIGIN };
  expect(
    (await request.post('/api/auth/login', { headers, data: { email: alice, password: PASSWORD } })).status(),
  ).toBe(204);
  const task = (await (await request.post('/api/tasks', { headers, data: { title: 'alice の写真' } })).json()) as {
    id: number;
  };
  const up = await request.post(`/api/tasks/${task.id}/attachments?name=a.png`, {
    headers: { ...headers, 'content-type': 'image/png' },
    data: PNG,
  });
  expect(up.status()).toBe(201);
  const { url } = (await up.json()) as { url: string };

  // bob として、別のブラウザのコンテキスト（Cookie も別）で開く
  const bob = newEmail('bob');
  await signUpByApi(request, bob);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(bob);
  await page.getByLabel('パスワード').fill(PASSWORD);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'タスク一覧' })).toBeVisible();
  const res = await page.request.get(url, { maxRedirects: 0 });
  expect(res.status()).toBe(404);
  await context.close();
});
