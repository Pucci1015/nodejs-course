// 6節: 環境変数をスキーマで読む。Config の型は、スキーマから作る
import { z } from 'zod';

z.config(z.locales.ja());

// 環境変数は、いつも文字列か、無い。空の文字列（PORT=）も「無い」と同じにする
const blankToUndefined = (v: unknown) => (v === '' ? undefined : v);

const Env = z
  .object({
    PORT: z.preprocess(blankToUndefined, z.string().regex(/^[0-9]{1,5}$/).transform(Number).pipe(z.number().min(1).max(65535)).default(9480)),
    LOG_LEVEL: z.preprocess(blankToUndefined, z.enum(['debug', 'info', 'warn', 'error']).default('info')),
    NODE_ENV: z.preprocess(blankToUndefined, z.enum(['development', 'test', 'production']).default('development')),
    DATABASE_URL: z.preprocess(blankToUndefined, z.string().optional()),
    FEATURE_SSE: z.preprocess(blankToUndefined, z.stringbool().default(false)), // 'true'・'1'・'yes'・'on' など
  })
  // 項目をまたぐ決まりは refine で書く
  .refine((env) => env.NODE_ENV !== 'production' || env.DATABASE_URL !== undefined, {
    path: ['DATABASE_URL'],
    error: 'production では必須です',
  })
  // アプリの中で使う形（camelCase）に変える
  .transform((env) => ({
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    env: env.NODE_ENV,
    databaseUrl: env.DATABASE_URL ?? null,
    featureSse: env.FEATURE_SSE,
  }));

export type Config = z.infer<typeof Env>;

export function loadConfig(source: NodeJS.ProcessEnv): Config {
  const result = Env.safeParse(source);
  if (result.success) return result.data;
  // 値そのものは書かない（パスワードが入っているかもしれない。第5部 第26章）
  const names = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`設定が正しくありません\n${names.join('\n')}`);
}

console.log(loadConfig(process.env));
