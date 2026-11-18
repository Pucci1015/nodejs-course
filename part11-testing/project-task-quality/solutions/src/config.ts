// 第26章 練習問題5の模範解答（ch26-app-structure/solutions/config.mjs）のコピー。成果物で使う設定を足した（「追加（成果物）」「変更（成果物）」）
// 第6部: データベースの設定を足した（「追加（第6部）」）
// 変更（第7部）: TypeScript にした。Config の型は、スキーマと loadConfig から作る（第38章 6節）
// 追加（第10部）: 画面の URL・メール・練習用の IdP・ログインの回数の上限の設定を足した。セッションの鍵は、開発では起動のたびに乱数で作る
// 設定を環境変数から読み、起動するときに1回だけ確かめる
import crypto from 'node:crypto';
import { z } from 'zod';

z.config(z.locales.ja());

export type ConfigIssue = { name: string; message: string };

export class ConfigError extends Error {
  readonly issues: ConfigIssue[];

  constructor(issues: ConfigIssue[]) {
    // 修正: 値は書かない。名前と理由だけ（秘密の値が、ログやターミナルに残らないように）
    super(`設定が正しくありません: ${issues.map((i) => `${i.name}（${i.message}）`).join('、')}`);
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

const int = (min: number, max: number) =>
  z
    .string()
    .regex(/^[0-9]{1,9}$/, `${min}〜${max} の整数`)
    .transform(Number)
    .pipe(z.number().min(min, `${min}〜${max} の整数`).max(max, `${min}〜${max} の整数`));

/** 'http://localhost:5173' のような、オリジンだけの URL か（パスや最後の / があればだめ） */
const isOrigin = (s: string): boolean => {
  try {
    const u = new URL(s);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.origin === s;
  } catch {
    return false;
  }
};

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: int(0, 65535).default(9490), // 変更（第7部）: 既定を 9490 に（第6部は 9460）。0 は「空いている番号を OS に選んでもらう」
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  CORS_ORIGINS: z
    .string()
    .transform((s) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().refine(isOrigin, 'http(s)://ホスト[:ポート] の形（パスや最後の / は付けない）')))
    .default([]),
  SESSION_SECRET: z.string().min(32, '32 文字以上').optional(),
  SHUTDOWN_DELAY_MS: int(0, 60_000).default(0), // 止める合図から、新しい接続を断るまで（ロードバランサが気づくのを待つ）
  SHUTDOWN_TIMEOUT_MS: int(0, 60_000).default(10_000), // それでも終わらないとき、あきらめるまで
  // 追加（成果物）: ここから下
  CURSOR_SECRET: z.string().min(32, '32 文字以上').optional(), // ページのカーソルに署名する鍵（第25章 6節）
  RATE_LIMIT_PER_MINUTE: int(0, 100_000).default(120), // 書き換え（POST・PATCH・DELETE）を、1つの IP から1分に何回まで。0 なら数えない
  MAX_DOING: int(1, 100).default(3), // 作業中（doing）にできるタスクの数（第26章 練習問題6の WIP 制限）
  SSE_HEARTBEAT_MS: int(100, 600_000).default(15_000), // SSE の心拍（第27章 5節）
  // 追加（第6部）: ここから下
  DATABASE_URL: z
    .string()
    // 変更（第11部）: 取り出さないかっこは (?:…) にする（regexp/no-unused-capturing-group）
    .refine(
      (s) => /^postgres(?:ql)?:\/\/[^/]+\/[^/?#]+/.test(s),
      'postgres://ユーザー:パスワード@ホスト:ポート/データベース の形',
    )
    .optional(), // 本番では必須。開発とテストは、第6部の compose.yaml のデータベース taskapi
  DATABASE_SCHEMA: z
    .string()
    .regex(/^[a-z_][a-z0-9_]{0,62}$/, '英小文字・数字・_ で 63 文字まで')
    .optional(), // テーブルを置くスキーマ。テストが、テストごとの箱を作って渡す。無ければ public
  DATABASE_POOL_MAX: int(1, 100).default(10), // プールの接続の数（第32章 5節）
  // 追加（第10部）: ここから下
  APP_URL: z
    .string()
    .refine(isOrigin, 'http(s)://ホスト[:ポート] の形（パスや最後の / は付けない）')
    .default('http://localhost:5173'), // 画面のオリジン。メールのリンクの頭にもなる
  SMTP_HOST: z.string().min(1).default('127.0.0.1'), // メールを渡す SMTP サーバ（開発では第53章の fake-smtp か Mailpit）
  SMTP_PORT: int(1, 65535).default(1025),
  MAIL_FROM: z.string().min(3).default('Task App <no-reply@example.com>'),
  OIDC_ISSUER: z.url().optional(), // 練習用の IdP（第54章）。3つとも書くか、3つとも書かない
  OIDC_CLIENT_ID: z.string().min(1).optional(),
  OIDC_CLIENT_SECRET: z.string().min(1).optional(),
  LOGIN_RATE_LIMIT_PER_MINUTE: int(0, 100_000).default(10), // ログイン・登録などを、1つの IP から1分に何回まで（第51章 6節）。0 なら数えない
  SESSION_MAX_AGE_HOURS: int(1, 24 * 90).default(24 * 7), // ログインが続く時間（使うたびに延びる）
});

// 追加（第6部）: 開発とテストで DATABASE_URL が無いときのつなぎ先（第6部の compose.yaml。開発用の仮のパスワード）
const DEV_DATABASE_URL = 'postgres://app:dev-only-password@127.0.0.1:5433/taskapi';

/** pino のログの段階 */
export type LogLevel = NonNullable<z.output<typeof Env>['LOG_LEVEL']>;

/**
 * @param env  ふつうは process.env
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  // 追加: .env に「PORT=」と書いたときの '' は、書かなかったのと同じにする
  const input = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v !== ''));
  const r = Env.safeParse(input);
  if (!r.success) throw new ConfigError(r.error.issues.map((i) => ({ name: String(i.path[0]), message: i.message })));
  // 変更（第7部）: 確かめが通ったら、e には z.output<typeof Env> の型が付く
  const e = r.data;
  const issues: ConfigIssue[] = [];
  // 追加: 本番だけの決まり。秘密の値は既定の値を持たない
  if (e.NODE_ENV === 'production' && e.SESSION_SECRET === undefined)
    issues.push({ name: 'SESSION_SECRET', message: '本番では必須' });
  // 追加（成果物）: カーソルの鍵も、本番では必須
  if (e.NODE_ENV === 'production' && e.CURSOR_SECRET === undefined)
    issues.push({ name: 'CURSOR_SECRET', message: '本番では必須' });
  // 追加（第6部）: データベースのつなぎ先（パスワードが入っている）も、本番では必須
  if (e.NODE_ENV === 'production' && e.DATABASE_URL === undefined)
    issues.push({ name: 'DATABASE_URL', message: '本番では必須' });
  // 追加（第10部）: IdP の設定は、3つそろっているか、どれも無いか
  const oidcSet = [e.OIDC_ISSUER, e.OIDC_CLIENT_ID, e.OIDC_CLIENT_SECRET].filter((v) => v !== undefined).length;
  if (oidcSet !== 0 && oidcSet !== 3)
    issues.push({ name: 'OIDC_ISSUER', message: 'OIDC_ISSUER・OIDC_CLIENT_ID・OIDC_CLIENT_SECRET は3つとも書く' });
  if (issues.length > 0) throw new ConfigError(issues);

  const logLevel: LogLevel = e.LOG_LEVEL ?? (e.NODE_ENV === 'test' ? 'silent' : 'info');
  return Object.freeze({
    env: e.NODE_ENV,
    host: e.HOST,
    port: e.PORT,
    // 追加: テストのときは、ログで出力をうめない
    logLevel,
    corsOrigins: Object.freeze(e.CORS_ORIGINS),
    // 変更（第10部）: 開発とテストで鍵が無ければ、起動のたびに乱数で作る（起動し直すと、ログインはやり直し）
    sessionSecret: e.SESSION_SECRET ?? crypto.randomBytes(32).toString('base64url'),
    shutdownDelayMs: e.SHUTDOWN_DELAY_MS,
    shutdownTimeoutMs: e.SHUTDOWN_TIMEOUT_MS,
    // 追加（成果物）: 開発とテストで鍵が無ければ、起動のたびに乱数で作る（起動し直すと、前のカーソルは使えなくなる）
    cursorSecret: e.CURSOR_SECRET ?? crypto.randomBytes(32).toString('base64url'),
    rateLimitPerMinute: e.RATE_LIMIT_PER_MINUTE,
    maxDoing: e.MAX_DOING,
    sseHeartbeatMs: e.SSE_HEARTBEAT_MS,
    // 追加（第6部）
    databaseUrl: e.DATABASE_URL ?? DEV_DATABASE_URL,
    databaseSchema: e.DATABASE_SCHEMA,
    databasePoolMax: e.DATABASE_POOL_MAX,
    // 追加（第10部）
    appUrl: e.APP_URL,
    smtp: Object.freeze({ host: e.SMTP_HOST, port: e.SMTP_PORT, from: e.MAIL_FROM }),
    oidc:
      e.OIDC_ISSUER !== undefined && e.OIDC_CLIENT_ID !== undefined && e.OIDC_CLIENT_SECRET !== undefined
        ? Object.freeze({ issuer: e.OIDC_ISSUER, clientId: e.OIDC_CLIENT_ID, clientSecret: e.OIDC_CLIENT_SECRET })
        : undefined,
    loginRateLimitPerMinute: e.LOGIN_RATE_LIMIT_PER_MINUTE,
    sessionMaxAgeMs: e.SESSION_MAX_AGE_HOURS * 60 * 60 * 1000,
  });
}

/** 追加（第7部）: 設定の型。loadConfig の戻り値から作る（項目を足しても、ここを直さなくてよい） */
export type Config = ReturnType<typeof loadConfig>;
