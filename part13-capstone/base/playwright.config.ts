// 画面から API・PostgreSQL・メールまで通す E2E の設定（第58章 8節）
// npm run e2e で、偽の SMTP サーバ・API・画面の開発サーバの3つを起動してから、e2e/ のテストを動かす
// PostgreSQL と Redis が要る（このリポジトリで docker compose up -d --wait。CI では GitHub Actions のサービス）
// 本番に近い形にした。画面は Vite の開発サーバではなく、ビルドした web/dist を API が配る（同じオリジン）
import { defineConfig, devices } from '@playwright/test';

// 開発で使う番号（API 9900、画面 5174、メール 1025・8025）とぶつからない番号にする
// 画面と API は 9906 の1つ（9905 は空けてある）
const WEB_PORT = 9906;
const SMTP_PORT = 9907;
const MAIL_HTTP_PORT = 9908;
export const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;
export const MAIL_URL = `http://127.0.0.1:${MAIL_HTTP_PORT}`;
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5434/roombooking';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6381';

export default defineConfig({
  testDir: 'e2e',
  // 結果（失敗したときのトレースなど）は、このフォルダに置く。.gitignore に書いてある
  outputDir: 'test-results',
  // 登録したユーザーやメールを順に読むので、1つずつ動かす
  workers: 1,
  // CI では、.only が残っていたら失敗にし、失敗したテストを1回だけやり直す（やり直して通ったら「flaky」と出る）
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: WEB_URL,
    // 失敗してやり直したときだけ、トレース（操作・画面・通信の記録）を残す
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // 偽の SMTP サーバ（第10部の道具）。届いたメールを HTTP で見せる
      command: 'node test/support/fake-smtp.ts',
      env: { SMTP_PORT: String(SMTP_PORT), HTTP_PORT: String(MAIL_HTTP_PORT), QUIET: '1' },
      url: `${MAIL_URL}/api/messages`,
      reuseExistingServer: !process.env.CI,
    },
    {
      // API と画面。画面をビルドし、毎回、空のスキーマ e2e と Redis のキー e2e:… を作り直してから起動する
      // ビルドした画面（web/dist）を、API が STATIC_DIR として配る
      command: 'npm --prefix web run build && node e2e/prepare-db.ts && node src/server.ts',
      env: {
        NODE_ENV: 'test',
        HOST: '127.0.0.1',
        PORT: String(WEB_PORT),
        DATABASE_URL,
        DATABASE_SCHEMA: 'e2e',
        APP_URL: WEB_URL, // メールのリンクの頭と、Origin の確かめに使う
        SMTP_HOST: '127.0.0.1',
        SMTP_PORT: String(SMTP_PORT),
        SESSION_SECRET: 'dev-only-session-secret-for-e2e-00000',
        RATE_LIMIT_PER_MINUTE: '0',
        LOGIN_RATE_LIMIT_PER_MINUTE: '0',
        STATIC_DIR: 'web/dist',
        REDIS_URL,
        QUEUE_PREFIX: 'e2e',
      },
      url: `${WEB_URL}/healthz`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000, // ビルドの時間も入るので、既定の 60 秒より長く待つ
    },
  ],
});
