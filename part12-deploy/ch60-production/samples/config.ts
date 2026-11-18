// 第60章 2.2節: 設定を環境変数から読み、起動するときに1回だけ確かめる。本番では、秘密の値が無ければ起動しない
// 動かし方（章のフォルダで）: node samples/config.ts
//                             NODE_ENV=production node samples/config.ts           → 終了コード 1
//                             node --env-file=.env samples/config.ts              → .env から読む
import { z } from 'zod';

z.config(z.locales.ja()); // zod のエラーを日本語に（第7部 第38章）

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.string().regex(/^\d{1,5}$/).transform(Number).default(9807),
  SESSION_SECRET: z.string().min(32).optional(),
});

export function loadConfig(env: NodeJS.ProcessEnv) {
  const r = Env.safeParse(env);
  if (!r.success) {
    // 名前と理由だけを書く（値は書かない。秘密の値が、ログやターミナルに残らないように）
    throw new Error(r.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join('\n'));
  }
  const e = r.data;
  if (e.NODE_ENV === 'production' && e.SESSION_SECRET === undefined) {
    throw new Error('SESSION_SECRET は本番では必須です');
  }
  return { ...e, SESSION_SECRET: e.SESSION_SECRET ?? 'dev-only-session-secret-0123456789abcdef' };
}

if (import.meta.main) {
  try {
    const config = loadConfig(process.env);
    // 秘密の値は、ログやターミナルに出さない（長さだけ）
    console.log({ ...config, SESSION_SECRET: `（${config.SESSION_SECRET.length} 文字）` });
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}
