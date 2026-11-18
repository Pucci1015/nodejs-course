// 第60章 練習問題1: 本番で必須の設定を確かめる（本文2節）
import { z } from 'zod';

export class ConfigError extends Error {
  /** 正しくなかった設定の名前（値は入れない） */
  readonly names: string[];
  constructor(names: string[]) {
    super(`設定が正しくありません: ${names.join('、')}`);
    this.name = 'ConfigError';
    this.names = names;
  }
}

/** 開発とテストで、DATABASE_URL が無いときに使うつなぎ先（第6部の compose.yaml） */
export const DEV_DATABASE_URL = 'postgres://app:dev-only-password@127.0.0.1:5433/taskapi';
/** 開発とテストで、SESSION_SECRETS が無いときに使う鍵 */
export const DEV_SESSION_SECRET = 'dev-only-session-secret-0123456789abcdef';

export type Config = {
  env: 'development' | 'test' | 'production';
  port: number;
  sessionSecrets: string[];
  databaseUrl: string;
};

// 使ってよい: z（zod）。使わずに if で書いてもよい
void z;

export function loadConfig(env: Record<string, string | undefined>): Config {
  // ここを書く
  throw new Error(`まだ書いていません: ${Object.keys(env).length}`);
}
