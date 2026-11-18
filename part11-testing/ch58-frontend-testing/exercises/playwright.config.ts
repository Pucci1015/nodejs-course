// 練習問題7の Playwright の設定（書き換えなくてよい）
// 画面は本文の samples/app、API は API_ENTRY のファイル（既定は samples/app/api-server.ts。check-e2e.ts がミュータントに替える）
// 本文のもの（9721・9722）や、手で起動したもの（9727・9728）とぶつからないように 9723・9724 を使う
import { defineConfig, devices } from '@playwright/test';

const API_PORT = 9723;
const WEB_PORT = 9724;
const ports = { API_PORT: String(API_PORT), WEB_PORT: String(WEB_PORT) };

export default defineConfig({
  // 模範解答（../solutions/e2e）も動かせるように、章のフォルダから探す
  testDir: '..',
  testMatch: '{exercises,solutions}/e2e/*.spec.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 15_000,
  reporter: 'list',
  // 結果（失敗したときのトレースなど）は、この設定のファイルの隣の test-results/ に置く
  outputDir: 'test-results',
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `node ${process.env.API_ENTRY ?? '../samples/app/api-server.ts'}`,
      env: { ...ports, TEST_RESET: '1' },
      url: `http://127.0.0.1:${API_PORT}/api/tasks`,
      reuseExistingServer: false,
    },
    {
      command: 'npx vite',
      cwd: '../samples/app',
      env: ports,
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: false,
    },
  ],
});
