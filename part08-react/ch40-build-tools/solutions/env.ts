// 第40章 練習問題2の模範解答: import.meta.env を Zod で確かめて、使いやすい形にする
import { z } from 'zod';

export class EnvError extends Error {
  readonly names: string[];
  constructor(names: string[]) {
    super(`環境変数が正しくありません: ${names.join(', ')}`);
    this.name = 'EnvError';
    this.names = names;
  }
}

/** 'http://127.0.0.1:9500' のような、オリジンだけの URL */
const origin = z.string().refine((s) => {
  try {
    return new URL(s).origin === s;
  } catch {
    return false;
  }
});

const Env = z.object({
  VITE_API_BASE: z.union([z.literal(''), origin]).default(''),
  VITE_POLL_MS: z
    .string()
    .regex(/^[0-9]+$/)
    .transform(Number)
    .pipe(z.number().min(1000).max(600_000))
    .default(5000),
  VITE_FEATURE_STATS: z.stringbool().default(false),
});

export type AppEnv = { apiBase: string; pollMs: number; featureStats: boolean };

/** ふつうは readEnv(import.meta.env) と呼ぶ */
export function readEnv(env: Record<string, unknown>): AppEnv {
  const r = Env.safeParse(env);
  if (!r.success) throw new EnvError([...new Set(r.error.issues.map((i) => String(i.path[0])))]);
  return { apiBase: r.data.VITE_API_BASE, pollMs: r.data.VITE_POLL_MS, featureStats: r.data.VITE_FEATURE_STATS };
}
