// 練習問題7: 画面から API まで通す E2E のテストを書く
// 使い方（exercises で）: npx playwright test e2e/tasks.spec.ts
//                         node check-e2e.ts e2e/tasks.spec.ts
import { expect, test } from '@playwright/test';

// テストごとに、API のデータを最初の状態に戻す（「牛乳を買う」（未完了）と「第58章を読む」（完了））
test.beforeEach(async ({ request }) => {
  const res = await request.post('/api/test/reset');
  expect(res.status()).toBe(204);
});

test('一覧が出る（見本）', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('listitem')).toHaveCount(2);
  await expect(page.getByText('2 件中 1 件完了')).toBeVisible();
});

// ここを書く
