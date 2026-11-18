// 練習問題6 のテスト。小さな Express のアプリを listen(0) で起動して、HTTP で確かめる
// 使い方: node --test require-role.test.ts
//   模範解答を試す: MODULE=../solutions/require-role.ts node --test require-role.test.ts
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import express, { type ErrorRequestHandler } from 'express';
import { HttpProblem } from './http-problem.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './require-role.ts');
const mod: typeof import('./require-role.ts') = await import(pathToFileURL(file).href);
const { requireRole } = mod;

let base = '';
let close = () => {};

before(async () => {
  const app = express();
  // ログインの代わり: X-Test-Role ヘッダの役割の人がログインしていることにする（テストだけの仕組み）
  app.use((req, _res, next) => {
    const role = req.get('x-test-role');
    if (role === 'member' || role === 'admin') req.user = { id: 1, role };
    next();
  });
  const ok: express.RequestHandler = (_req, res) => {
    res.json({ ok: true });
  };
  app.get('/admin-only', requireRole('admin'), ok);
  app.get('/everyone', requireRole('member', 'admin'), ok);
  app.get('/member-only', requireRole('member'), ok);
  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof HttpProblem) res.status(err.status).json({ detail: err.detail });
    else res.status(500).json({ detail: String(err) });
  };
  app.use(onError);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () => server.close();
});
after(() => close());

const get = async (p: string, role?: string) => {
  const r = await fetch(base + p, {
    headers: role === undefined ? {} : { 'x-test-role': role },
    signal: AbortSignal.timeout(3000),
  });
  return { status: r.status, body: await r.json() };
};

test('管理者だけの道: 管理者は通り、会員は 403、ログインしていなければ 401', async () => {
  assert.deepEqual(await get('/admin-only', 'admin'), { status: 200, body: { ok: true } });
  assert.deepEqual(await get('/admin-only', 'member'), { status: 403, body: { detail: '管理者だけが使えます' } });
  assert.deepEqual(await get('/admin-only'), { status: 401, body: { detail: 'ログインしてください' } });
});

test('2つの役割を書いた道: どちらも通り、ログインしていなければ 401', async () => {
  assert.equal((await get('/everyone', 'member')).status, 200);
  assert.equal((await get('/everyone', 'admin')).status, 200);
  assert.deepEqual(await get('/everyone'), { status: 401, body: { detail: 'ログインしてください' } });
});

test('会員だけの道: 管理者でも 403。文は「会員だけが使えます」', async () => {
  assert.deepEqual(await get('/member-only', 'member'), { status: 200, body: { ok: true } });
  assert.deepEqual(await get('/member-only', 'admin'), { status: 403, body: { detail: '会員だけが使えます' } });
});

test('役割を1つも書かないと、作るときに Error（だれも通れない道は書き間違い）', () => {
  assert.throws(() => requireRole(), Error);
});

test('型のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
