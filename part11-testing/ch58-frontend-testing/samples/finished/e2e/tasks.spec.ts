// 第58章 8節: 本物のブラウザで、画面から API まで通して確かめる（E2E）
import { expect, test } from '@playwright/test';

// テストごとに、API のデータを最初の状態（2つのタスク）に戻す
test.beforeEach(async ({ request }) => {
  const res = await request.post('/api/test/reset');
  expect(res.status()).toBe(204);
});

test('一覧が出る', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'やること' })).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(2);
  await expect(page.getByRole('checkbox', { name: '牛乳を買う' })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: '第58章を読む' })).toBeChecked();
});

test('足したタスクは最後に出て、読み込み直しても残る', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('textbox', { name: '新しいタスク' }).fill('パンを買う');
  await page.getByRole('button', { name: '追加' }).click();

  await expect(page.getByRole('listitem').last()).toContainText('パンを買う');
  await expect(page.getByRole('textbox', { name: '新しいタスク' })).toHaveValue('');
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'パンを買う' })).toBeVisible();
});

test('空の題名では足せない', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '追加' }).click();

  await expect(page.getByRole('alert')).toHaveText('題名を入れてください');
  await expect(page.getByRole('listitem')).toHaveCount(2);
});
