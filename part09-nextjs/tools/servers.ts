// 練習問題のテストで使う道具: 練習用の API と、Next.js のサーバを、テストのために起動して、終わったら止める
//   テストは、学習者が自分で動かしている `npm run api`・`npx next dev` とぶつからないように、
//   別のポートと、別のビルドのフォルダ（.next-test）を使う
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const API_SERVER = fileURLToPath(new URL('../api/server.ts', import.meta.url));
const NEXT_BIN = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));

export type Server = { url: string; stop: () => Promise<void>; output: () => string };

/** url に何か応答が返るまで待つ（最大 timeoutMs） */
async function waitFor(url: string, child: ChildProcess, out: () => string, timeoutMs: number): Promise<void> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (child.exitCode !== null) throw new Error(`サーバが止まりました:\n${out()}`);
    try {
      await fetch(url, { signal: AbortSignal.timeout(2000) });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error(`${url} が ${timeoutMs / 1000} 秒たっても応答しません:\n${out()}`);
}

function run(command: string, args: string[], options: { cwd?: string; env: Record<string, string> }) {
  // detached: 子のプロセス（Next.js は中でさらにプロセスを作る）を、まとめて止められるようにする
  const child = spawn(command, args, { cwd: options.cwd, env: { ...process.env, ...options.env }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout?.on('data', (b: Buffer) => (log += b.toString()));
  child.stderr?.on('data', (b: Buffer) => (log += b.toString()));
  const stop = async () => {
    if (child.exitCode !== null || child.pid === undefined) return;
    const exited = new Promise((r) => child.once('exit', r));
    try {
      process.kill(-child.pid, 'SIGTERM'); // マイナスの番号: そのプロセスのグループ全体
    } catch {
      return;
    }
    await Promise.race([exited, new Promise((r) => setTimeout(r, 3000))]);
  };
  return { child, stop, output: () => log };
}

/** 練習用の API を起動する。例のタスク5つ入り（seed: false で空） */
export async function startApi(port: number, { seed = true } = {}): Promise<Server> {
  const { child, stop, output } = run(process.execPath, [API_SERVER], { env: { PORT: String(port), SEED: seed ? '1' : '0', LOG_LEVEL: 'error' } });
  const url = `http://127.0.0.1:${port}`;
  await waitFor(`${url}/api/tasks`, child, output, 15_000);
  return { url, stop, output };
}

/** dir の Next.js のアプリを、開発サーバで起動する。API_URL で、つなぐ API を渡す */
export async function startNext(dir: string, port: number, env: Record<string, string> = {}): Promise<Server> {
  const { child, stop, output } = run(process.execPath, [NEXT_BIN, 'dev', '-p', String(port)], {
    cwd: dir,
    env: { NEXT_DIST_DIR: '.next-test', NEXT_TELEMETRY_DISABLED: '1', ...env },
  });
  const url = `http://localhost:${port}`;
  await waitFor(url, child, output, 60_000);
  return { url, stop, output };
}

/** 第50章: dir の Next.js のアプリを、ビルドしてから（next build）、本番のサーバで起動する（next start）。
 *  前もって作る HTML や、'use cache' で覚えたものは、本番のサーバでしか、本番と同じには動かないため */
export async function buildAndStartNext(dir: string, port: number, env: Record<string, string> = {}): Promise<Server> {
  const allEnv = { NEXT_DIST_DIR: '.next-test', NEXT_TELEMETRY_DISABLED: '1', ...env };
  const build = run(process.execPath, [NEXT_BIN, 'build'], { cwd: dir, env: allEnv });
  const code = await new Promise<number | null>((r) => build.child.once('exit', r));
  if (code !== 0) throw new Error(`next build が失敗しました:\n${build.output()}`);
  const { child, stop, output } = run(process.execPath, [NEXT_BIN, 'start', '-p', String(port)], { cwd: dir, env: allEnv });
  const url = `http://localhost:${port}`;
  await waitFor(url, child, output, 30_000);
  return { url, stop, output: () => build.output() + output() };
}

/** ページを読み、ステータスと HTML を返す。HTML は、ストリーミングで後から届いた部分も含む */
export async function getPage(url: string): Promise<{ status: number; html: string; headers: Headers }> {
  const res = await fetch(url, { redirect: 'manual' });
  return { status: res.status, html: await res.text(), headers: res.headers };
}

/** HTML から、タグを除いた文字だけを取り出す（「画面に何が書いてあるか」を確かめるため） */
export function textOf(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '') // React が文字の間に入れる <!-- --> は、何も無いのと同じ
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** notFound() で「見つからない」になったページか。
 *  Next.js は、本文を流し始めた後で notFound() が呼ばれると、ステータスを 200 のままにして、
 *  検索エンジンに載せない印（<meta name="robots" content="noindex">）を付ける（第47章 6節） */
export function isNotFound(page: { status: number; html: string }): boolean {
  return page.status === 404 || /<meta name="robots" content="noindex"/.test(page.html);
}

/** HTML の中の <li> の数 */
export const countItems = (html: string): number => html.match(/<li[\s>]/g)?.length ?? 0;
