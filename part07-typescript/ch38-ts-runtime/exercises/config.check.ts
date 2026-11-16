// 練習問題2 の型の確かめ（書き換えない）
import type { Equal, Expect } from './type-assert.ts';
import { type Config, loadConfig } from './config.ts';

export type Checks = [
  Expect<
    Equal<
      Config,
      {
        port: number;
        host: string;
        logLevel: 'debug' | 'info' | 'warn' | 'error';
        env: 'development' | 'test' | 'production';
        databaseUrl: string | null;
      }
    >
  >,
  Expect<Equal<Parameters<typeof loadConfig>, [env: NodeJS.ProcessEnv]>>,
];
