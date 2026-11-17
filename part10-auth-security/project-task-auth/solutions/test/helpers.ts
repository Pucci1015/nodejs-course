// テストの道具（api.test.ts と auth.test.ts が使う）。名前が .test.ts で終わらないので、これ自体はテストとして動かない
// 追加（第10部）: 第7部の api.test.ts の前半（サーバの起動・fetch・SSE を読む道具）を、ここに移した。
//   足したもの: 偽の SMTP サーバ（届いたメールを読む）、ユーザーを登録してログインする signUp、base ごとの Cookie
// PostgreSQL が要る（~/dev/part06 で docker compose up -d --wait）。サーバごとに、データベース taskapi の中に
// 新しいスキーマ（test_ で始まる名前）を作って DATABASE_SCHEMA で渡し、テストが終わったら消す
import assert from 'node:assert/strict';
import { type ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';
import pg from 'pg';
import { type ReceivedMail, startFakeSmtp } from './fake-smtp.ts';

export const SERVER = path.resolve(import.meta.dirname, process.env.API_SERVER ?? '../src/server.ts');
const DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/taskapi';
export const ORIGIN = 'http://localhost:5173';
/** テストのユーザーのパスワード（第51章のパスワードの決まりに合うもの） */
export const PASSWORD = 'purple-otter-rides-91';

/**
 * 応答。テストでは JSON の中の形を自由に確かめたいので、json() を any にする（fetch の json() は Promise<unknown>）
 * Response は、この型の変数にそのまま入れられる
 */
export type TestResponse = Omit<Response, 'json' | 'clone'> & { json(): Promise<any>; clone(): TestResponse };

/** テストが起動したサーバ（子プロセス）。使ったスキーマ・ログ・終わるのを待つ Promise を足した */
export type Server = ChildProcess & { schema: string; log: string; exited: Promise<number | null>; base: string };

/** PostgreSQL に SQL を1つ送る（テストの準備と片付け用） */
export async function admin(sql: string, params: unknown[] = []) {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
  } catch (err) {
    throw new Error('PostgreSQL につながりません。~/dev/part06 で docker compose up -d --wait を動かしてから、もう一度試してください', { cause: err });
  }
  try {
    return await client.query(sql, params);
  } finally {
    await client.end();
  }
}

const schemas: string[] = [];
/** テスト用の空のスキーマを作って、その名前を返す。最後に cleanup で全部消す */
async function newSchema() {
  const name = `test_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
  await admin(`CREATE SCHEMA ${name}`);
  schemas.push(name);
  return name;
}

// 追加（第10部）: 偽の SMTP サーバ。空いているポートで、このテストのプロセスの中に1つだけ起動する
let mail: Awaited<ReturnType<typeof startFakeSmtp>> | undefined;
async function mailServer() {
  mail ??= await startFakeSmtp({ smtpPort: 0, httpPort: 0 });
  return mail;
}

/** サーバを起動して、/healthz が答えるまで待つ。schema を渡さなければ、新しい空のスキーマを使う */
export async function startServer(port: number, env: Record<string, string> = {}, options: { schema?: string } = {}): Promise<Server> {
  const schema = options.schema ?? (await newSchema());
  const { smtpPort } = await mailServer();
  const proc = spawn(process.execPath, [SERVER], {
    env: {
      ...process.env,
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: String(port),
      CORS_ORIGINS: ORIGIN,
      SSE_HEARTBEAT_MS: '200',
      RATE_LIMIT_PER_MINUTE: '0',
      DATABASE_URL,
      DATABASE_SCHEMA: schema,
      // 追加（第10部）: メールは偽の SMTP サーバへ。セッションの鍵は決まった値（同じスキーマで起動し直しても、ログインが続くように）
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(smtpPort),
      SESSION_SECRET: 'dev-only-session-secret-for-tests-0000',
      LOGIN_RATE_LIMIT_PER_MINUTE: '0',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const child: Server = Object.assign(proc, {
    schema,
    log: '',
    exited: new Promise<number | null>((r) => proc.once('exit', (code) => r(code))),
    base: `http://127.0.0.1:${port}`,
  });
  child.stdout?.on('data', (d: Buffer) => (child.log += String(d)));
  child.stderr?.on('data', (d: Buffer) => (child.log += String(d)));
  for (let i = 0; i < 50; i++) {
    if (child.exitCode !== null) break;
    try {
      await fetch(`http://127.0.0.1:${port}/healthz`, { signal: AbortSignal.timeout(500) });
      return child;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  child.kill();
  throw new Error(`サーバが起動しませんでした:\n${child.log}`);
}

export async function stopServer(child: Server | undefined) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await child.exited;
}

/** 最後の片付け: 偽の SMTP サーバを止め、作ったスキーマを消す */
export async function cleanup() {
  await mail?.close();
  mail = undefined;
  for (const name of schemas.splice(0)) await admin(`DROP SCHEMA IF EXISTS ${name} CASCADE`);
}

/** 追加（第10部）: base（サーバ）ごとの、ログインしている人の Cookie（sid=…） */
export const jar = new Map<string, string>();

type ApiOptions = { method?: string; body?: unknown; headers?: Record<string, string>; base: string; cookie?: string | null };

/**
 * JSON を送る fetch。body が文字列なら、そのまま送る。
 * 変更（第10部）: cookie を渡さなければ、jar に覚えた、その base の Cookie を付ける（null なら付けない）
 */
export function api(p: string, { method = 'GET', body, headers = {}, base, cookie }: ApiOptions): Promise<TestResponse> {
  const h: Record<string, string> = { ...headers };
  if (body !== undefined && !Object.keys(h).some((k) => k.toLowerCase() === 'content-type')) h['content-type'] = 'application/json';
  const c = cookie === undefined ? jar.get(base) : cookie;
  if (c !== undefined && c !== null) h.cookie = c;
  return fetch(base + p, { method, headers: h, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
}

/** problem+json であること、status が同じことを確かめて、本文を返す */
export async function problem(r: TestResponse, status: number) {
  assert.equal(r.status, status);
  assert.match(r.headers.get('content-type') ?? '', /^application\/problem\+json/);
  const body = await r.json();
  assert.equal(body.status, status);
  assert.equal(typeof body.title, 'string');
  return body;
}

// ---- 追加（第10部）: メールとログイン

const taken = new Set<number>();
/** to に届いた、まだ読んでいないメールを待つ（メールは待たずに送られるので、少し後に届く） */
export async function takeMail(to: string, ms = 3000): Promise<ReceivedMail> {
  const { messages } = await mailServer();
  const deadline = Date.now() + ms;
  for (;;) {
    const m = messages.find((x) => !taken.has(x.id) && x.to.includes(to));
    if (m !== undefined) {
      taken.add(m.id);
      return m;
    }
    if (Date.now() > deadline) throw new Error(`${to} にメールが届きませんでした`);
    await new Promise((r) => setTimeout(r, 30));
  }
}

/** to に、まだ読んでいないメールが無いこと（少し待ってから確かめる） */
export async function noMail(to: string, ms = 300) {
  await new Promise((r) => setTimeout(r, ms));
  const { messages } = await mailServer();
  assert.ok(!messages.some((x) => !taken.has(x.id) && x.to.includes(to)), `${to} にメールが届いています`);
}

/** メールの本文のリンクから、トークン（#token= の後ろ）を取り出す */
export function tokenIn(m: ReceivedMail): string {
  const t = /#token=([A-Za-z0-9_-]{43})/.exec(m.text)?.[1];
  assert.ok(t !== undefined, `メールにトークンがありません: ${m.text}`);
  return t;
}

/** 応答の Set-Cookie から、sid=… の部分を取り出す（無ければ undefined） */
export function sessionCookie(r: TestResponse, name = 'sid'): string | undefined {
  const line = r.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
  return line?.split(';')[0];
}

let count = 0;
/** 新しいメールアドレス（テストごとに別の人） */
export const newEmail = (name = 'user') => `${name}${++count}-${process.pid}@example.com`;

/** ログインして、Cookie を返す */
export async function logIn(base: string, email: string, password = PASSWORD): Promise<string> {
  const r = await api('/api/auth/login', { base, method: 'POST', body: { email, password }, cookie: null });
  assert.equal(r.status, 204, `ログインできませんでした: ${await r.clone().text()}`);
  const c = sessionCookie(r);
  assert.ok(c !== undefined, 'ログインしたのに Set-Cookie がありません');
  return c;
}

/**
 * 登録 → 確認のメールのリンク → ログイン、までをして、Cookie を返す。
 * remember が true なら、その base の Cookie として jar に覚える（api() が自動で付ける）
 */
export async function signUp(base: string, email = newEmail(), { remember = true }: { remember?: boolean } = {}): Promise<{ email: string; cookie: string }> {
  const r = await api('/api/auth/register', { base, method: 'POST', body: { email, password: PASSWORD }, cookie: null });
  assert.equal(r.status, 202, `登録できませんでした: ${await r.clone().text()}`);
  const token = tokenIn(await takeMail(email));
  assert.equal((await api('/api/auth/verify-email', { base, method: 'POST', body: { token }, cookie: null })).status, 204);
  const cookie = await logIn(base, email);
  if (remember) jar.set(base, cookie);
  return { email, cookie };
}

// ---- SSE を読む。届いたイベントを events にため、waitFor で待つ

/** SSE の1つのイベント（event・data・id・retry・comment の行） */
export type SseEvent = Record<string, string | undefined>;

export async function openEvents({ base, headers = {}, cookie }: { base: string; headers?: Record<string, string>; cookie?: string | null }) {
  const ac = new AbortController();
  const c = cookie === undefined ? jar.get(base) : cookie;
  const res = await fetch(`${base}/api/events`, { headers: { ...headers, ...(c ? { cookie: c } : {}) }, signal: ac.signal });
  const events: SseEvent[] = [];
  let wake = () => {};
  let ended = false;
  if (res.body === null) throw new Error('SSE の応答にボディがありません');
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  const done = (async () => {
    let buf = '';
    try {
      for (;;) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += value;
        let i: number;
        while ((i = buf.indexOf('\n\n')) !== -1) {
          const e: SseEvent = {};
          for (const line of buf.slice(0, i).split('\n')) {
            const m = /^([^:]*):? ?(.*)$/.exec(line);
            const [name, v] = [m?.[1] ?? '', m?.[2] ?? ''];
            if (name === '') e.comment = v;
            else if (name === 'data') e.data = e.data === undefined ? v : `${e.data}\n${v}`;
            else e[name] = v;
          }
          events.push(e);
          buf = buf.slice(i + 2);
          wake();
        }
      }
    } catch {
      // abort したとき
    }
    ended = true;
    wake();
  })();
  let from = 0;
  return {
    res,
    events,
    done,
    /** pred にあてはまるイベントを、前に見たものより後ろから探す */
    async waitFor(pred: (e: SseEvent) => boolean, ms = 2000): Promise<SseEvent> {
      const deadline = Date.now() + ms;
      for (;;) {
        const i = events.findIndex((e, n) => n >= from && pred(e));
        const found = events[i];
        if (found !== undefined) {
          from = i + 1;
          return found;
        }
        if (ended || Date.now() > deadline) throw new Error(`イベントが届きませんでした: ${JSON.stringify(events)}`);
        await new Promise<void>((r) => {
          wake = r;
          setTimeout(r, 50);
        });
      }
    },
    close: () => ac.abort(),
  };
}
