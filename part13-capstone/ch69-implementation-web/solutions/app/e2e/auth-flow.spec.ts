// 登録 → メールのリンク → ログイン → ログアウトの通しの流れ（土台）
// 画面 → API → PostgreSQL、API → 仕事の列 → 偽の SMTP サーバ、の全部を本物のまま通す
// 画面は、ビルドしたものを API が配る（playwright.config.ts）
// 動かし方: npm run e2e（playwright.config.ts が2つのサーバを起動する）
import { expect, test } from '@playwright/test';
import { PASSWORD, linkIn, newEmail, waitForMail } from './helpers.ts';

test('登録 → 確認のメールのリンク → ログイン → ログアウト', async ({ page, request }) => {
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
  await expect(page.getByRole('heading', { level: 1, name: 'その日の予約' })).toBeVisible();
  await expect(page.getByRole('banner').getByText(email)).toBeVisible();

  // ログアウトすると、ログインのページに移る。最初のページはもう開けない
  await page.getByRole('button', { name: 'ログアウト' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'ログイン' })).toBeVisible();
  await page.goto('/');
  await expect(page).toHaveURL(/\/login\?next=/);
});
