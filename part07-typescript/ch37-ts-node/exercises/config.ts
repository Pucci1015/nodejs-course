// 練習問題2: 環境変数から設定を読む関数を、手で型を付けて書いてください。要件は README にあります。
// 確かめ方: node --test config.test.ts

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type AppEnv = 'development' | 'test' | 'production';

export type Config = {
  port: number;
  host: string;
  logLevel: LogLevel;
  env: AppEnv;
  databaseUrl: string | null;
};

export class ConfigError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`設定が正しくありません: ${problems.join(' / ')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  throw new Error('まだ書いていません');
}
