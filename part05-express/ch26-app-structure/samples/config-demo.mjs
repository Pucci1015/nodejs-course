// 設定を環境変数から読み、起動するときに1回だけ確かめる（第26章 5節）
//   $ node samples/config-demo.mjs                                  ← 既定の値で動く（開発のとき）
//   $ node --env-file=samples/.env.example samples/config-demo.mjs          ← .env.example の値を読む
//   $ PORT=abc LOG_LEVEL=loud node config-demo.mjs          ← 間違いを全部まとめて知らせ、終了コード 1
//   $ NODE_ENV=production node config-demo.mjs              ← 本番では SESSION_SECRET が無いと起動しない
import { z } from 'zod';

z.config(z.locales.ja());

const Env = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().default('127.0.0.1'),
    PORT: z.string().regex(/^[0-9]{1,5}$/, '0〜65535 の整数').transform(Number).pipe(z.number().max(65535, '0〜65535 の整数')).default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    // カンマで区切った URL の並び。'' なら空の配列
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean))
      .pipe(z.array(z.url({ protocol: /^https?$/ }))),
    SESSION_SECRET: z.string().min(32, '32 文字以上').optional(),
  })
  // 本番だけの決まり: 秘密の値は既定の値を持たない。無ければ起動しない
  .refine((e) => e.NODE_ENV !== 'production' || e.SESSION_SECRET !== undefined, { path: ['SESSION_SECRET'], message: '本番では必須' });

function loadConfig(env) {
  const r = Env.safeParse(env); // env は process.env 全体。知らない名前（PATH など）は z.object が取り除く
  if (!r.success) {
    // 値そのものは書かない（秘密の値が、ログやターミナルの履歴に残らないように）。名前と理由だけ
    const lines = r.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
    throw new Error(`設定が正しくありません:\n${lines.join('\n')}`);
  }
  return Object.freeze({
    env: r.data.NODE_ENV,
    host: r.data.HOST,
    port: r.data.PORT,
    logLevel: r.data.LOG_LEVEL,
    corsOrigins: Object.freeze(r.data.CORS_ORIGINS),
    sessionSecret: r.data.SESSION_SECRET,
  });
}

try {
  const config = loadConfig(process.env);
  // 秘密の値は、あるかどうかだけを見せる
  console.log({ ...config, sessionSecret: config.sessionSecret ? '(設定済み)' : '(なし)' });
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}
