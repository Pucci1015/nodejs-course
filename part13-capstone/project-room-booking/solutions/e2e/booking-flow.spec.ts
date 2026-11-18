// 予約の通しの流れ（第69章 8節）。docs/plan.md の終わりの確かめ「2つのブラウザで、片方の予約がもう片方に出る」
// 管理者が会議室を足す → alice が予約する → bob の画面に、読み直さずに出る（SSE）→ alice が取り消す → bob の画面から消える
import { expect, test } from '@playwright/test';
import { grantAdmin, logIn, newEmail, signUpByApi, tokyoDate } from './helpers.ts';

test('管理者が会議室を足し、alice の予約と取り消しが bob の画面に届く', async ({ browser, request }) => {
  const admin = newEmail('admin');
  const alice = newEmail('alice');
  const bob = newEmail('bob');
  // 準備は API とスクリプトで（画面の登録は auth-flow.spec.ts で確かめてある）
  for (const email of [admin, alice, bob]) await signUpByApi(request, email);
  grantAdmin(admin);

  // 人ごとに別のブラウザのコンテキスト（Cookie が別）を開く
  const newPage = async () => (await browser.newContext()).newPage();
  const adminPage = await newPage();
  const alicePage = await newPage();
  const bobPage = await newPage();

  // 管理者: 会議室を足す
  await logIn(adminPage, admin);
  await adminPage.getByRole('link', { name: '会議室の管理' }).click();
  await adminPage.getByLabel('名前', { exact: true }).fill('会議室A');
  await adminPage.getByLabel('定員', { exact: true }).fill('6');
  await adminPage.getByRole('button', { name: '足す' }).click();
  await expect(adminPage.getByLabel('会議室A の名前')).toBeVisible();

  // alice と bob が、明日の表を開く（今日だと、時刻によっては枠が過ぎている）
  const day = tokyoDate(1);
  for (const [page, email] of [
    [alicePage, alice],
    [bobPage, bob],
  ] as const) {
    await logIn(page, email);
    await page.goto(`/?date=${day}`);
    await expect(page.getByRole('columnheader', { name: '会議室A（6人）' })).toBeVisible();
  }
  // bob のメニューには、管理のページが無い
  await expect(bobPage.getByRole('link', { name: '会議室の管理' })).toHaveCount(0);

  // alice が 10:00 から 1 時間、予約する
  await alicePage.getByRole('button', { name: '会議室A 10:00 から予約' }).click();
  const dialog = alicePage.getByRole('dialog');
  await dialog.getByLabel('題名').fill('定例');
  await dialog.getByRole('button', { name: '予約する' }).click();
  await expect(alicePage.getByRole('cell', { name: '定例（自分）' })).toBeVisible();

  // bob の画面にも、読み直さずに出る（SSE の知らせ → 表を読み直す）。bob には「（自分）」が付かない
  await expect(bobPage.getByRole('cell', { name: '定例', exact: true })).toBeVisible();
  await expect(bobPage.getByRole('button', { name: '会議室A 10:00 から予約' })).toHaveCount(0);

  // alice が「自分の予約」から取り消す
  await alicePage.getByRole('link', { name: '自分の予約' }).click();
  await alicePage.getByRole('button', { name: '「定例」を取り消す' }).click();
  await alicePage.getByRole('dialog').getByRole('button', { name: '取り消す' }).click();
  await expect(alicePage.getByText('これからの予約はありません。')).toBeVisible();

  // bob の画面から消え、枠がまた空く
  await expect(bobPage.getByRole('button', { name: '会議室A 10:00 から予約' })).toBeVisible();
  await expect(bobPage.getByRole('cell', { name: '定例', exact: true })).toHaveCount(0);
});
