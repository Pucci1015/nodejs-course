// テストで使う道具: 偽の API を HTTP のサーバとして動かす・Next.js の開発サーバを起動する・ページを読む
import { spawn } from 'node:child_process';
import { createServer, type ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createFakeApi, type FakeTask } from './fake-api.ts';

const NEXT_BIN = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const APP_DIR = fileURLToPath(new URL('..', import.meta.url));

/**
 * 偽の API（fake-api.ts）を、本物の HTTP のサーバにする。Next.js はサーバで API を呼ぶので、fetch を差し替えられないため。
 * 書き換えが成功したら、/api/events（SSE）につないでいる人に知らせる
 */
export async function startFakeApi(port: number, seed: Partial<FakeTask>[]) {
  const fake = createFakeApi(seed);
  const listeners = new Set<ServerResponse>();
  const server = createServer((req, res) => {
    if (req.url === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      res.write('retry: 3000\n\n');
      listeners.add(res);
      req.on('close', () => listeners.delete(res));
      return;
    }
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const method = req.method ?? 'GET';
      const body = chunks.length > 0 ? Buffer.concat(chunks).toString() : undefined;
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
      void fake.fetch(`http://localhost${req.url ?? '/'}`, { method, headers, body }).then(async (r) => {
        res.writeHead(r.status, Object.fromEntries(r.headers));
        res.end(await r.text());
        if (method !== 'GET' && r.ok) {
          const type = method === 'POST' ? 'task.created' : method === 'DELETE' ? 'task.deleted' : 'task.updated';
          for (const l of listeners) l.write(`event: ${type}\ndata: {}\n\n`);
        }
      });
    });
  });
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${port}`,
    fake,
    stop: () =>
      new Promise<void>((resolve) => {
        for (const l of listeners) l.end();
        server.close(() => resolve());
      }),
  };
}

/** このアプリを、Next.js の開発サーバで起動する。npm run dev とぶつからないように、別のポートと .next-test を使う */
export async function startNext(port: number, env: Record<string, string>) {
  const child = spawn(process.execPath, [NEXT_BIN, 'dev', '-p', String(port)], {
    cwd: APP_DIR,
    env: { ...process.env, NEXT_DIST_DIR: '.next-test', NEXT_TELEMETRY_DISABLED: '1', ...env },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (b: Buffer) => (log += b.toString()));
  child.stderr.on('data', (b: Buffer) => (log += b.toString()));
  const url = `http://localhost:${port}`;
  const end = Date.now() + 60_000;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`next dev が止まりました:\n${log}`);
    if (Date.now() > end) throw new Error(`next dev が起動しません:\n${log}`);
    try {
      await fetch(url, { signal: AbortSignal.timeout(2000) });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  const stop = async () => {
    if (child.exitCode !== null || child.pid === undefined) return;
    const exited = new Promise((r) => child.once('exit', r));
    process.kill(-child.pid, 'SIGTERM');
    await Promise.race([exited, new Promise((r) => setTimeout(r, 3000))]);
  };
  return { url, stop, output: () => log };
}

/** ページを読む。ストリーミングで後から届いた部分も含めた HTML を返す */
export async function getPage(url: string) {
  const res = await fetch(url, { redirect: 'manual' });
  return { status: res.status, html: await res.text(), headers: res.headers };
}

/** HTML から、タグを除いた文字だけを取り出す */
export function textOf(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
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

/** notFound() で「見つからない」になったページか（第47章 6.2節） */
export const isNotFound = (page: { status: number; html: string }) => page.status === 404 || /<meta name="robots" content="noindex"/.test(page.html);
