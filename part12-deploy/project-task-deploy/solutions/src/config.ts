// 第26章 練習問題5の模範解答（ch26-app-structure/solutions/config.mjs）のコピー。成果物で使う設定を足した（「追加（成果物）」「変更（成果物）」）
// 第6部: データベースの設定を足した（「追加（第6部）」）
// 変更（第7部）: TypeScript にした。Config の型は、スキーマと loadConfig から作る（第38章 6節）
// 追加（第10部）: 画面の URL・メール・練習用の IdP・ログインの回数の上限の設定を足した。セッションの鍵は、開発では起動のたびに乱数で作る
// 追加（第12部）: 本番で動かすための設定（プロキシ・Redis・仕事の列・ファイルの置き場所・画面の配信・監視）を足した
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
  // 追加（第12部）: ここから下
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
    .optional(), // 本番では必須。開発とテストは、第6部の compose.yaml の Redis（6380）
  QUEUE_PREFIX: z
    .string()
    .regex(/^[a-z][a-z0-9_]{0,40}$/, '英小文字で始まり、英小文字・数字・_ で 41 文字まで')
    .default('taskapp'), // Redis のキーの頭（仕事の列と、SSE の知らせ）。テストは、テストごとに変える
  WORKER_MODE: z.enum(['inline', 'separate']).default('inline'), // inline なら、API のプロセスの中でワーカーも動かす（第64章 7節）
  DIGEST_CRON: z.string().min(9).default('0 8 * * *'), // 毎朝のお知らせを送る時刻（cron の書き方。第64章 6節）
  DIGEST_TZ: z.string().refine(isTimeZone, 'Asia/Tokyo のようなタイムゾーンの名前').default('Asia/Tokyo'),
  S3_ENDPOINT: z.url().optional(), // S3 互換のストレージの入口（第63章 3節）。本番の AWS の S3 なら書かない
  S3_PUBLIC_ENDPOINT: z.url().optional(), // ブラウザが署名付き URL で使う入口。無ければ S3_ENDPOINT と同じ
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_BUCKET: z
    .string()
    .regex(/^[a-z0-9][a-z0-9.-]{2,62}$/, 'バケットの名前')
    .default('task-files'),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(), // 本番では必須（値は Secrets に。第60章 3節）
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_FORCE_PATH_STYLE: z.stringbool().default(true), // http://ホスト/バケット/キー の形にする（S3 互換のサーバの多く）
  ATTACHMENT_MAX_BYTES: int(1, 50_000_000).default(5_000_000), // 添付ファイル1つの上限（第63章 5節）
  ATTACHMENTS_PER_TASK: int(1, 100).default(10), // 1つのタスクに付けられる数
  SWEEP_GRACE_MINUTES: int(0, 7 * 24 * 60).default(60), // 置いてからこの時間たった孤児だけを消す（第63章 8節）
  STATIC_DIR: z.string().min(1).optional(), // ビルドした画面（web/dist）のフォルダ。あれば、API と同じサーバで配る（第65章 6節）
  METRICS_TOKEN: z.string().min(32, '32 文字以上').optional(), // /metrics を読む合言葉（第66章 3節）。本番では必須
});

/** 追加（第12部）: Intl が知っているタイムゾーンの名前か */
function isTimeZone(s: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: s });
    return true;
  } catch {
    return false;
  }
}

// 追加（第12部）: 開発とテストで REDIS_URL・S3 が無いときのつなぎ先（第6部の compose.yaml の Redis と、第63章の mini-s3）
const DEV_REDIS_URL = 'redis://127.0.0.1:6380';
const DEV_S3_ENDPOINT = 'http://127.0.0.1:9800';

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
  // 追加（第12部）: 本番で必須のもの。足りないものを全部集めてから止まる（第60章 2節）
  if (e.NODE_ENV === 'production') {
    for (const name of ['REDIS_URL', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'METRICS_TOKEN'] as const)
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
    // 変更（第12部）: 本番の送信サービスのための、ユーザー名・パスワード・TLS を足した
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
    // 追加（第12部）
    trustProxy: e.TRUST_PROXY,
    appVersion: e.APP_VERSION ?? e.RENDER_GIT_COMMIT ?? 'dev',
    redisUrl: e.REDIS_URL ?? DEV_REDIS_URL,
    queuePrefix: e.QUEUE_PREFIX,
    workerMode: e.WORKER_MODE,
    digest: Object.freeze({ cron: e.DIGEST_CRON, tz: e.DIGEST_TZ }),
    s3: Object.freeze({
      // 本番で S3_ENDPOINT が無ければ、AWS の S3（SDK が region から入口を決める）
      endpoint: e.S3_ENDPOINT ?? (e.NODE_ENV === 'production' ? undefined : DEV_S3_ENDPOINT),
      publicEndpoint:
        e.S3_PUBLIC_ENDPOINT ?? e.S3_ENDPOINT ?? (e.NODE_ENV === 'production' ? undefined : DEV_S3_ENDPOINT),
      region: e.S3_REGION,
      bucket: e.S3_BUCKET,
      // 開発とテストは、mini-s3 の練習用の鍵（第63章 3.1節）
      accessKeyId: e.S3_ACCESS_KEY_ID ?? 'dev-only-access-key',
      secretAccessKey: e.S3_SECRET_ACCESS_KEY ?? 'dev-only-secret-key',
      forcePathStyle: e.S3_FORCE_PATH_STYLE,
    }),
    attachmentMaxBytes: e.ATTACHMENT_MAX_BYTES,
    attachmentsPerTask: e.ATTACHMENTS_PER_TASK,
    sweepGraceMs: e.SWEEP_GRACE_MINUTES * 60 * 1000,
    staticDir: e.STATIC_DIR,
    metricsToken: e.METRICS_TOKEN,
  });
}

/** 追加（第7部）: 設定の型。loadConfig の戻り値から作る（項目を足しても、ここを直さなくてよい） */
export type Config = ReturnType<typeof loadConfig>;
