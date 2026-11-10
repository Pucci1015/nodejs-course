// 練習問題5: 設定を環境変数から読み、起動するときに1回だけ確かめる
// 要件は exercises/README.md の問題5です。確かめ方:
//   $ node --test config.test.mjs
// 今のひな形は、よく見る「とりあえず動く」書き方です。間違った値を黙って既定の値にしてしまいます。

export class ConfigError extends Error {
  constructor(issues) {
    super(`設定が正しくありません: ${JSON.stringify(issues)}`);
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

export function loadConfig(env = process.env) {
  // ここを書く: zod で確かめ、間違いをすべて集めて ConfigError を投げる
  return {
    env: env.NODE_ENV || 'development',
    host: env.HOST || '127.0.0.1',
    port: Number(env.PORT) || 3000,
    logLevel: env.LOG_LEVEL || 'info',
    corsOrigins: (env.CORS_ORIGINS || '').split(','),
    sessionSecret: env.SESSION_SECRET || 'secret',
    shutdownDelayMs: Number(env.SHUTDOWN_DELAY_MS) || 0,
    shutdownTimeoutMs: Number(env.SHUTDOWN_TIMEOUT_MS) || 10000,
  };
}
