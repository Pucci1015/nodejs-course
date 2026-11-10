// 第26章 5節で書く、起動するときに環境変数を1回だけ確かめるプログラムの完成形
// 使い方（~/dev/part05/ch26-app-structure で）: node samples/config-check.mjs
//   PORT=abc LOG_LEVEL=loud node samples/config-check.mjs
import { z } from 'zod';

z.config(z.locales.ja()); // 既定の文を日本語にする

const Env = z.object({
  PORT: z.string().regex(/^[0-9]{1,5}$/, '0〜65535 の整数').transform(Number).pipe(z.number().max(65535)).default(3000),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const r = Env.safeParse(process.env);
if (!r.success) {
  console.error('設定が正しくありません:');
  for (const issue of r.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`); // 名前と理由だけ。値は書かない
  }
  process.exitCode = 1;
} else {
  const config = Object.freeze({ port: r.data.PORT, logLevel: r.data.LOG_LEVEL });
  console.log('設定:', config);
}
