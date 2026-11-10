// 第26章 練習問題5の模範解答（ch26-app-structure/solutions/config.mjs）のコピー。成果物で使う設定を足した（「追加（成果物）」「変更（成果物）」）
// 設定を環境変数から読み、起動するときに1回だけ確かめる
import crypto from 'node:crypto';
import { z } from 'zod';

z.config(z.locales.ja());

export class ConfigError extends Error {
  /** @param {{ name: string, message: string }[]} issues */
  constructor(issues) {
    // 修正: 値は書かない。名前と理由だけ（秘密の値が、ログやターミナルに残らないように）
    super(`設定が正しくありません: ${issues.map((i) => `${i.name}（${i.message}）`).join('、')}`);
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

const int = (min, max) =>
  z
    .string()
    .regex(/^[0-9]{1,9}$/, `${min}〜${max} の整数`)
    .transform(Number)
    .pipe(z.number().min(min, `${min}〜${max} の整数`).max(max, `${min}〜${max} の整数`));

/** 'http://localhost:5173' のような、オリジンだけの URL か（パスや最後の / があればだめ） */
const isOrigin = (s) => {
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
  PORT: int(0, 65535).default(9360), // 変更（成果物）: 既定を 9360 に。0 は「空いている番号を OS に選んでもらう」
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  CORS_ORIGINS: z
    .string()
    .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean))
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
});

/**
 * @param {Record<string, string | undefined>} env  ふつうは process.env
 */
export function loadConfig(env = process.env) {
  // 追加: .env に「PORT=」と書いたときの '' は、書かなかったのと同じにする
  const input = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v !== ''));
  const r = Env.safeParse(input);
  const issues = r.success ? [] : r.error.issues.map((i) => ({ name: String(i.path[0]), message: i.message }));
  // 追加: 本番だけの決まり。秘密の値は既定の値を持たない
  if (r.success && r.data.NODE_ENV === 'production' && r.data.SESSION_SECRET === undefined) {
    issues.push({ name: 'SESSION_SECRET', message: '本番では必須' });
  }
  // 追加（成果物）: カーソルの鍵も、本番では必須
  if (r.success && r.data.NODE_ENV === 'production' && r.data.CURSOR_SECRET === undefined) {
    issues.push({ name: 'CURSOR_SECRET', message: '本番では必須' });
  }
  if (issues.length > 0) throw new ConfigError(issues);

  const e = r.data;
  return Object.freeze({
    env: e.NODE_ENV,
    host: e.HOST,
    port: e.PORT,
    // 追加: テストのときは、ログで出力をうめない
    logLevel: e.LOG_LEVEL ?? (e.NODE_ENV === 'test' ? 'silent' : 'info'),
    corsOrigins: Object.freeze(e.CORS_ORIGINS),
    sessionSecret: e.SESSION_SECRET,
    shutdownDelayMs: e.SHUTDOWN_DELAY_MS,
    shutdownTimeoutMs: e.SHUTDOWN_TIMEOUT_MS,
    // 追加（成果物）: 開発とテストで鍵が無ければ、起動のたびに乱数で作る（起動し直すと、前のカーソルは使えなくなる）
    cursorSecret: e.CURSOR_SECRET ?? crypto.randomBytes(32).toString('base64url'),
    rateLimitPerMinute: e.RATE_LIMIT_PER_MINUTE,
    maxDoing: e.MAX_DOING,
    sseHeartbeatMs: e.SSE_HEARTBEAT_MS,
  });
}
