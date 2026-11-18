// 練習問題3 のテスト
// 使い方: node --test healthcheck.test.ts
//   模範解答を試す: MODULE=../solutions/healthcheck.ts node --test healthcheck.test.ts
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './healthcheck.ts');
const { check }: typeof import('./healthcheck.ts') = await import(pathToFileURL(file).href);
const run = promisify(execFile);

// /ok は 200、/sick は 503、/slow は答えない、/redirect は 302
let server: http.Server;
let base = '';
let port = 0;
before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/ok' || req.url === '/healthz') res.end('{"status":"ok"}');
    else if (req.url === '/sick') res.writeHead(503).end('{"status":"error"}');
    else if (req.url === '/redirect') res.writeHead(302, { location: '/ok' }).end();
    // /slow は何も返さない
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as AddressInfo).port;
  base = `http://127.0.0.1:${port}`;
});
after(() => {
  server.closeAllConnections();
  server.close();
});

/** コマンドを動かして、終了コードと標準エラー出力を返す */
async function cli(args: string[], env: Record<string, string> = {}) {
  try {
    const r = await run(process.execPath, [file, ...args], { env: { ...env }, timeout: 10_000 });
    return { code: 0, stderr: r.stderr };
  } catch (err) {
    const e = err as { code: number; stderr: string };
    return { code: e.code, stderr: e.stderr };
  }
}

test('check: 2xx なら ok', async () => {
  assert.deepEqual(await check(`${base}/ok`, 1000), { ok: true });
});

test('check: 2xx 以外は ok ではなく、理由に状態コード', async () => {
  const r = await check(`${base}/sick`, 1000);
  assert.equal(r.ok, false);
  assert.match(r.reason ?? '', /503/);
});

test('check: リダイレクトをたどらない（302 は ok ではない）', async () => {
  const r = await check(`${base}/redirect`, 1000);
  assert.equal(r.ok, false);
  assert.match(r.reason ?? '', /302/);
});

test('check: 答えなければ timeoutMs で打ち切る', async () => {
  const started = performance.now();
  const r = await check(`${base}/slow`, 300);
  assert.equal(r.ok, false);
  assert.ok(performance.now() - started < 1500);
});

test('check: つながらなければ ok ではない（例外を投げない）', async () => {
  const r = await check('http://127.0.0.1:1/healthz', 1000);
  assert.equal(r.ok, false);
  assert.ok((r.reason ?? '').length > 0);
});

test('コマンド: 元気なら終了コード 0 で、何も書かない', async () => {
  const r = await cli([`${base}/ok`]);
  assert.deepEqual(r, { code: 0, stderr: '' });
});

test('コマンド: URL を省くと PORT の /healthz', async () => {
  assert.equal((await cli([], { PORT: String(port) })).code, 0);
});

test('コマンド: 元気でなければ終了コード 1 と理由', async () => {
  const r = await cli([`${base}/sick`]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /503/);
});

test('コマンド: HEALTHCHECK_TIMEOUT_MS で時間切れを決める', async () => {
  const started = performance.now();
  const r = await cli([`${base}/slow`], { HEALTHCHECK_TIMEOUT_MS: '300' });
  assert.equal(r.code, 1);
  assert.ok(performance.now() - started < 3000);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
