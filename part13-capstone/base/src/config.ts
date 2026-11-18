// 設定を環境変数から読み、起動するときに1回だけ確かめる（第26章 5節・第38章 6節・第60章 2節）
// 土台（第12部の成果物から、タスク・添付ファイル・お知らせの設定を除いたもの）。会議室の予約の設定は、このファイルに足していく
import crypto from 'node:crypto';
import { z } from 'zod';

z.config(z.locales.ja());

export type ConfigIssue = { name: string; message: string };

export class ConfigError extends Error {
  readonly issues: ConfigIssue[];

  constructor(issues: ConfigIssue[]) {
    // 値は書かない。名前と理由だけ（秘密の値が、ログやターミナルに残らないように）
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
  PORT: int(0, 65535).default(9900), // 0 は「空いている番号を OS に選んでもらう」
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  SESSION_SECRET: z.string().min(32, '32 文字以上').optional(),
  SHUTDOWN_DELAY_MS: int(0, 60_000).default(0), // 止める合図から、新しい接続を断るまで（ロードバランサが気づくのを待つ）
  SHUTDOWN_TIMEOUT_MS: int(0, 60_000).default(10_000), // それでも終わらないとき、あきらめるまで
  RATE_LIMIT_PER_MINUTE: int(0, 100_000).default(120), // 書き換え（POST・PATCH・DELETE）を、1つの IP から1分に何回まで。0 なら数えない
  DATABASE_URL: z
    .string()
    // 取り出さないかっこは (?:…) にする（regexp/no-unused-capturing-group）
    .refine(
      (s) => /^postgres(?:ql)?:\/\/[^/]+\/[^/?#]+/.test(s),
      'postgres://ユーザー:パスワード@ホスト:ポート/データベース の形',
    )
    .optional(), // 本番では必須。開発とテストは、このリポジトリの compose.yaml のデータベース roombooking
  DATABASE_SCHEMA: z
    .string()
    .regex(/^[a-z_][a-z0-9_]{0,62}$/, '英小文字・数字・_ で 63 文字まで')
    .optional(), // テーブルを置くスキーマ。テストが、テストごとの箱を作って渡す。無ければ public
  DATABASE_POOL_MAX: int(1, 100).default(10), // プールの接続の数（第32章 5節）
  APP_URL: z
    .string()
    .refine(isOrigin, 'http(s)://ホスト[:ポート] の形（パスや最後の / は付けない）')
    .default('http://localhost:5174'), // 画面のオリジン。メールのリンクの頭にもなる
  SMTP_HOST: z.string().min(1).default('127.0.0.1'), // メールを渡す SMTP サーバ（開発では第53章の fake-smtp か Mailpit）
  SMTP_PORT: int(1, 65535).default(1025),
  MAIL_FROM: z.string().min(3).default('Room Booking <no-reply@example.com>'),
  OIDC_ISSUER: z.url().optional(), // 練習用の IdP（第54章）。3つとも書くか、3つとも書かない
  OIDC_CLIENT_ID: z.string().min(1).optional(),
  OIDC_CLIENT_SECRET: z.string().min(1).optional(),
  LOGIN_RATE_LIMIT_PER_MINUTE: int(0, 100_000).default(10), // ログイン・登録などを、1つの IP から1分に何回まで（第51章 6節）。0 なら数えない
  SESSION_MAX_AGE_HOURS: int(1, 24 * 90).default(24 * 7), // ログインが続く時間（使うたびに延びる）
  TRUST_PROXY: int(0, 10).default(0), // 前に立つプロキシの数（第60章 7節）。0 なら X-Forwarded-For を信じない
  // /version で返す版（第62章 7節）。無ければ、Render が渡すコミット（RENDER_GIT_COMMIT）、それも無ければ 'dev'
  APP_VERSION: z
    .string()
    .regex(/^[\w.-]{1,64}$/, '英数字・. ・- で 64 文字まで')
    .optional(),
  RENDER_GIT_COMMIT: z
    .string()
    .regex(/^[0-9a-f]{7,64}$/, 'コミットの ID')
    .optional(),
  SMTP_USER: z.string().min(1).optional(), // 本番のメールの送信サービス（第53章 8節）。2つとも書くか、どちらも書かない
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_SECURE: z.stringbool().default(false), // true なら、最初から TLS でつなぐ（ポート 465）
  REDIS_URL: z
    .string()
    .regex(/^rediss?:\/\/./, 'redis:// か rediss:// で始まる URL')
    .optional(), // 本番では必須。開発とテストは、このリポジトリの compose.yaml の Redis（6381）
  QUEUE_PREFIX: z
    .string()
    .regex(/^[a-z][a-z0-9_]{0,40}$/, '英小文字で始まり、英小文字・数字・_ で 41 文字まで')
    .default('rooms'), // Redis のキーの頭（仕事の列と、SSE の知らせ）。テストは、テストごとに変える
  WORKER_MODE: z.enum(['inline', 'separate']).default('inline'), // inline なら、API のプロセスの中でワーカーも動かす（第64章 7節）
  STATIC_DIR: z.string().min(1).optional(), // ビルドした画面（web/dist）のフォルダ。あれば、API と同じサーバで配る（第65章 6節）
  METRICS_TOKEN: z.string().min(32, '32 文字以上').optional(), // /metrics を読む合言葉（第66章 3節）。本番では必須
});

// 開発とテストで REDIS_URL が無いときのつなぎ先（このリポジトリの compose.yaml の Redis）
const DEV_REDIS_URL = 'redis://127.0.0.1:6381';

// 開発とテストで DATABASE_URL が無いときのつなぎ先（このリポジトリの compose.yaml の PostgreSQL。開発用の仮のパスワード）
const DEV_DATABASE_URL = 'postgres://app:dev-only-password@127.0.0.1:5434/roombooking';

/** pino のログの段階 */
export type LogLevel = NonNullable<z.output<typeof Env>['LOG_LEVEL']>;

/**
 * @param env  ふつうは process.env
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  // .env に「PORT=」と書いたときの '' は、書かなかったのと同じにする
  const input = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v !== ''));
  const r = Env.safeParse(input);
  if (!r.success) throw new ConfigError(r.error.issues.map((i) => ({ name: String(i.path[0]), message: i.message })));
  // 確かめが通ったら、e には z.output<typeof Env> の型が付く
  const e = r.data;
  const issues: ConfigIssue[] = [];
  // 本番だけの決まり。秘密の値は既定の値を持たない
  if (e.NODE_ENV === 'production' && e.SESSION_SECRET === undefined)
    issues.push({ name: 'SESSION_SECRET', message: '本番では必須' });
  // データベースのつなぎ先（パスワードが入っている）も、本番では必須
  if (e.NODE_ENV === 'production' && e.DATABASE_URL === undefined)
    issues.push({ name: 'DATABASE_URL', message: '本番では必須' });
  // IdP の設定は、3つそろっているか、どれも無いか
  const oidcSet = [e.OIDC_ISSUER, e.OIDC_CLIENT_ID, e.OIDC_CLIENT_SECRET].filter((v) => v !== undefined).length;
  if (oidcSet !== 0 && oidcSet !== 3)
    issues.push({ name: 'OIDC_ISSUER', message: 'OIDC_ISSUER・OIDC_CLIENT_ID・OIDC_CLIENT_SECRET は3つとも書く' });
  // 本番で必須のもの。足りないものを全部集めてから止まる（第60章 2節）
  if (e.NODE_ENV === 'production') {
    for (const name of ['REDIS_URL', 'METRICS_TOKEN'] as const)
      if (e[name] === undefined) issues.push({ name, message: '本番では必須' });
  }
  if ((e.SMTP_USER === undefined) !== (e.SMTP_PASS === undefined))
    issues.push({ name: 'SMTP_USER', message: 'SMTP_USER と SMTP_PASS は2つとも書く' });
  if (issues.length > 0) throw new ConfigError(issues);

  const logLevel: LogLevel = e.LOG_LEVEL ?? (e.NODE_ENV === 'test' ? 'silent' : 'info');
  return Object.freeze({
    env: e.NODE_ENV,
    host: e.HOST,
    port: e.PORT,
    // テストのときは、ログで出力をうめない
    logLevel,
    // 開発とテストで鍵が無ければ、起動のたびに乱数で作る（起動し直すと、ログインはやり直し）
    sessionSecret: e.SESSION_SECRET ?? crypto.randomBytes(32).toString('base64url'),
    shutdownDelayMs: e.SHUTDOWN_DELAY_MS,
    shutdownTimeoutMs: e.SHUTDOWN_TIMEOUT_MS,
    rateLimitPerMinute: e.RATE_LIMIT_PER_MINUTE,
    databaseUrl: e.DATABASE_URL ?? DEV_DATABASE_URL,
    databaseSchema: e.DATABASE_SCHEMA,
    databasePoolMax: e.DATABASE_POOL_MAX,
    appUrl: e.APP_URL,
    // 本番の送信サービスのための、ユーザー名・パスワード・TLS を足した
    smtp: Object.freeze({
      host: e.SMTP_HOST,
      port: e.SMTP_PORT,
      from: e.MAIL_FROM,
      secure: e.SMTP_SECURE,
      auth:
        e.SMTP_USER !== undefined && e.SMTP_PASS !== undefined ? { user: e.SMTP_USER, pass: e.SMTP_PASS } : undefined,
    }),
    oidc:
      e.OIDC_ISSUER !== undefined && e.OIDC_CLIENT_ID !== undefined && e.OIDC_CLIENT_SECRET !== undefined
        ? Object.freeze({ issuer: e.OIDC_ISSUER, clientId: e.OIDC_CLIENT_ID, clientSecret: e.OIDC_CLIENT_SECRET })
        : undefined,
    loginRateLimitPerMinute: e.LOGIN_RATE_LIMIT_PER_MINUTE,
    sessionMaxAgeMs: e.SESSION_MAX_AGE_HOURS * 60 * 60 * 1000,
    trustProxy: e.TRUST_PROXY,
    appVersion: e.APP_VERSION ?? e.RENDER_GIT_COMMIT ?? 'dev',
    redisUrl: e.REDIS_URL ?? DEV_REDIS_URL,
    queuePrefix: e.QUEUE_PREFIX,
    workerMode: e.WORKER_MODE,
    staticDir: e.STATIC_DIR,
    metricsToken: e.METRICS_TOKEN,
  });
}

/** 設定の型。loadConfig の戻り値から作る（項目を足しても、ここを直さなくてよい） */
export type Config = ReturnType<typeof loadConfig>;
