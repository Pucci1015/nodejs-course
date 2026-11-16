// 練習問題2 の模範解答
import { z } from 'zod';

/** 空の文字列（PORT=）は「無い」と同じにする */
const blank = (v: unknown) => (v === '' ? undefined : v);

const Env = z
  .object({
    PORT: z.preprocess(blank, z.string().regex(/^[0-9]{1,5}$/).transform(Number).pipe(z.number().min(1).max(65535)).default(9480)),
    HOST: z.preprocess(blank, z.string().default('127.0.0.1')),
    LOG_LEVEL: z.preprocess(blank, z.enum(['debug', 'info', 'warn', 'error']).default('info')),
    NODE_ENV: z.preprocess(blank, z.enum(['development', 'test', 'production']).default('development')),
    DATABASE_URL: z.preprocess(blank, z.string().optional()),
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.DATABASE_URL !== undefined, { path: ['DATABASE_URL'], error: 'production では必須です' })
  .transform((env) => ({
    port: env.PORT,
    host: env.HOST,
    logLevel: env.LOG_LEVEL,
    env: env.NODE_ENV,
    databaseUrl: env.DATABASE_URL ?? null,
  }));

export type Config = z.infer<typeof Env>;

export class ConfigError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`設定が正しくありません: ${problems.join(', ')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const result = Env.safeParse(env);
  if (result.success) return result.data;
  // 値は書かず、間違っている環境変数の名前だけを集める（同じ名前は1回）
  const names = result.error.issues.map((issue) => issue.path.join('.'));
  throw new ConfigError([...new Set(names)]);
}
