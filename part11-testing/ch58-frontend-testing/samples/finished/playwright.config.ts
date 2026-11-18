// 第58章 8節: Playwright の設定。テストの前に、API と Vite の開発サーバを起動する
// 手で起動したもの（9727・9728）とぶつからないように、E2E では 9721・9722 を使う
import { defineConfig, devices } from '@playwright/test';

const API_PORT = 9721;
const WEB_PORT = 9722;
const ports = { API_PORT: String(API_PORT), WEB_PORT: String(WEB_PORT) };

export default defineConfig({
  testDir: 'e2e',
  // API のデータは1つなので、テストを1つずつ順に動かす
  workers: 1,
  fullyParallel: false,
  // 1つのテストは 15 秒まで。expect が待つのは 5 秒まで（既定）
  timeout: 15_000,
  reporter: 'list',
  // 結果（失敗したときのトレースなど）は、この設定のファイルの隣の test-results/ に置く
  outputDir: 'test-results',
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    // 失敗したテストだけ、何が起きたかの記録（トレース）を残す
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node api-server.ts',
      env: { ...ports, TEST_RESET: '1' },
      url: `http://127.0.0.1:${API_PORT}/api/tasks`,
      reuseExistingServer: false,
    },
    {
      command: 'npx vite',
      env: ports,
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: false,
    },
  ],
});
