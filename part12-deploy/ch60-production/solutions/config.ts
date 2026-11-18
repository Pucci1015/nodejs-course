// 第60章 練習問題1の模範解答: 本番で必須の設定を確かめる（本文2節）
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

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .regex(/^\d{1,5}$/)
    .transform(Number)
    .pipe(z.number().max(65535))
    .default(9807),
  // カンマで分けて、前後の空白を除く。空の要素（,,）も 32 文字未満なので断られる
  SESSION_SECRETS: z
    .string()
    .transform((s) => s.split(',').map((x) => x.trim()))
    .pipe(z.array(z.string().min(32)))
    .optional(),
  DATABASE_URL: z
    .string()
    .regex(/^postgres(?:ql)?:\/\//)
    .optional(),
});

export function loadConfig(env: Record<string, string | undefined>): Config {
  // 空の文字列は、書かなかったのと同じにする
  const input = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v !== ''));
  const r = Env.safeParse(input);
  if (!r.success) {
    // 名前だけを集める（zod の issue の path の最初が、環境変数の名前）。同じ名前は1つに
    throw new ConfigError([...new Set(r.error.issues.map((i) => String(i.path[0])))]);
  }
  const e = r.data;
  // 本番だけの決まり。足りないものを全部集めてから投げる（1つ直して起動して、また次… にならないように）
  const missing: string[] = [];
  if (e.NODE_ENV === 'production') {
    if (e.SESSION_SECRETS === undefined) missing.push('SESSION_SECRETS');
    if (e.DATABASE_URL === undefined) missing.push('DATABASE_URL');
  }
  if (missing.length > 0) throw new ConfigError(missing);
  return {
    env: e.NODE_ENV,
    port: e.PORT,
    sessionSecrets: e.SESSION_SECRETS ?? [DEV_SESSION_SECRET],
    databaseUrl: e.DATABASE_URL ?? DEV_DATABASE_URL,
  };
}
