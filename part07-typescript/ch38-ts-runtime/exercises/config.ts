// 練習問題2: 第37章の練習問題2の loadConfig を、Zod で書き直してください。要件は README にあります。
// 確かめ方: node --test config.test.ts
import { z } from 'zod';

// ここに環境変数のスキーマを書く

// Config の型は、スキーマから作る（z.infer）
export type Config = unknown;

export class ConfigError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`設定が正しくありません: ${problems.join(', ')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  throw new Error('まだ書いていません');
}
