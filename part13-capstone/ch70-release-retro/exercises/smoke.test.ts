// 練習問題5 のテスト。偽のアプリ（node:http）を listen(0) で起動して、main を呼ぶ
// 使い方: node --test smoke.test.ts
//   模範解答を試す: MODULE=../solutions/smoke.ts node --test smoke.test.ts
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { afterEach, mock, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './smoke.ts');
const mod: typeof import('./smoke.ts') = await import(pathToFileURL(file).href);
const { main } = mod;

type Reply = { status: number; type: string; body: string };
const json = (status: number, body: unknown): Reply => ({
  status,
  type: 'application/json',
  body: JSON.stringify(body),
});

const HEALTHY: Record<string, Reply> = {
  '/healthz': json(200, { status: 'ok' }),
  '/readyz': json(200, { status: 'ready', checks: { database: 'ok', redis: 'ok' } }),
  '/version': json(200, { version: 'compose' }),
  '/': { status: 200, type: 'text/html; charset=utf-8', body: '<!doctype html><title>会議室の予約</title>' },
  '/api/auth/me': json(401, { title: 'Unauthorized', status: 401, detail: 'ログインしてください' }),
};

/** 偽のアプリを起動して、ベースの URL と止める関数を返す */
async function fakeApp(replies: Record<string, Reply>) {
  const server = http.createServer((req, res) => {
    const r = replies[req.url ?? ''] ?? json(404, { status: 404 });
    res.writeHead(r.status, { 'content-type': r.type }).end(r.body);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const close = () => {
    server.closeAllConnections(); // fetch がつないだままの接続も切る（残ると、テストが終わらない）
    return new Promise((resolve) => server.close(resolve));
  };
  return { base: `http://127.0.0.1:${port}`, close };
}

/** main を呼び、console.log・console.error に出たものを集める */
async function run(argv: string[]) {
  const log = mock.method(console, 'log', () => {});
  const err = mock.method(console, 'error', () => {});
  const code = await main(argv);
  const out = log.mock.calls.map((c) => String(c.arguments[0]));
  const errors = err.mock.calls.map((c) => String(c.arguments[0]));
  return { code, out, errors };
}

afterEach(() => mock.restoreAll());

test('使い方の間違いは 2', async () => {
  const r = await run([]);
  assert.equal(r.code, 2);
  assert.match(r.errors.join('\n'), /使い方/);
  assert.equal((await run(['http://a', 'http://b'])).code, 2);
});

test('全部合っていれば 0', async () => {
  const app = await fakeApp(HEALTHY);
  const r = await run([app.base]).finally(app.close);
  assert.deepEqual(r.out, [
    '[OK] /healthz',
    '[OK] /readyz',
    '[OK] /version',
    '[OK] /',
    '[OK] /api/auth/me',
    'すべて成功しました',
  ]);
  assert.equal(r.code, 0);
});

test('違うところを NG にして、理由を書く。数えて 1', async () => {
  const app = await fakeApp({
    ...HEALTHY,
    '/readyz': json(503, { status: 'not ready', checks: { database: 'error', redis: 'ok' } }),
    '/version': json(200, { version: '' }),
    '/': json(200, { message: '画面が配られていない' }),
  });
  const r = await run([app.base + '/']).finally(app.close); // 最後の / があっても、// にしない
  assert.equal(r.out.length, 6);
  assert.equal(r.out[0], '[OK] /healthz');
  assert.match(r.out[1] ?? '', /^\[NG\] \/readyz: .*503/);
  assert.match(r.out[2] ?? '', /^\[NG\] \/version: /);
  assert.match(r.out[3] ?? '', /^\[NG\] \/: .*text\/html/);
  assert.equal(r.out[4], '[OK] /api/auth/me');
  assert.equal(r.out[5], '3 件失敗しました');
  assert.equal(r.code, 1);
});

test('つながらなくても止まらず、全部 NG', async () => {
  const app = await fakeApp(HEALTHY);
  await app.close(); // 止めたサーバの番号につなぐ
  const r = await run([app.base]);
  assert.equal(r.out.filter((l) => l.startsWith('[NG] ')).length, 5);
  assert.equal(r.out.at(-1), '5 件失敗しました');
  assert.equal(r.code, 1);
});

test('型のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
