// 練習問題7の模範解答: 画面から API まで通す E2E のテスト
// 確かめ方（exercises で）: node check-e2e.ts ../solutions/e2e/tasks.spec.ts
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  const res = await request.post('/api/test/reset');
  expect(res.status()).toBe(204);
});

test('一覧が出る（見本）', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('listitem')).toHaveCount(2);
  await expect(page.getByText('2 件中 1 件完了')).toBeVisible();
});

// 追加: 画面に出るだけでなく、読み込み直しても残る（＝サーバに保存された）ことまで確かめる
test('チェックを付けると完了になり、読み込み直しても完了のまま', async ({ page }) => {
  await page.goto('/');
  const checkbox = page.getByRole('checkbox', { name: '牛乳を買う' });

  // 追加: check() は「押した直後にチェックが付いたか」まで確かめる。この画面は、サーバの応答の後に
  //       付くので、check() は失敗する。click() で押してから、付くまで expect で待つ
  await checkbox.click();

  await expect(checkbox).toBeChecked();
  await expect(page.getByText('2 件中 2 件完了')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: '牛乳を買う' })).toBeChecked();
});

// 追加: 反対向き（完了 → 未完了）も確かめる
test('チェックを外すと未完了に戻り、読み込み直しても未完了のまま', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('checkbox', { name: '第58章を読む' }).click();

  await expect(page.getByText('2 件中 0 件完了')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: '第58章を読む' })).not.toBeChecked();
});

test('消すと一覧から消え、読み込み直しても戻らない', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '「牛乳を買う」を消す' }).click();

  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('checkbox', { name: '牛乳を買う' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByText('1 件中 1 件完了')).toBeVisible();
});
