// 練習問題2 のテスト
// 使い方: node --test https-only.test.ts
//   模範解答を試す: MODULE=../solutions/https-only.ts node --test https-only.test.ts
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './https-only.ts');
const { httpsOnly }: typeof import('./https-only.ts') = await import(pathToFileURL(file).href);

// enabled: true のアプリと false のアプリを、空いているポートで起動する
const servers: Server[] = [];
const bases: Record<string, string> = {};

function start(name: string, enabled: boolean, exempt?: string[]) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(httpsOnly(exempt === undefined ? { enabled } : { enabled, exempt }));
  app.all('/{*rest}', (req, res) => {
    res.json({ path: req.originalUrl });
  });
  return new Promise<void>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => {
      bases[name] = `http://127.0.0.1:${(s.address() as AddressInfo).port}`;
      resolve();
    });
    servers.push(s);
  });
}

before(async () => {
  await start('on', true);
  await start('off', false);
  await start('custom', true, ['/ping']);
});
after(() => {
  for (const s of servers) s.close();
});

function call(base: string, p: string, init: { method?: string; proto?: string; host?: string } = {}) {
  const headers: Record<string, string> = {};
  if (init.proto) headers['x-forwarded-proto'] = init.proto;
  if (init.host) headers['x-forwarded-host'] = init.host;
  return fetch(`${base}${p}`, {
    method: init.method ?? 'GET',
    headers,
    redirect: 'manual',
    signal: AbortSignal.timeout(3000),
  });
}

test('https で来たら、そのまま次へ', async () => {
  const res = await call(bases.on!, '/tasks?page=2', { proto: 'https' });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { path: '/tasks?page=2' });
});

test('http の GET は、同じ場所の https へ 308（クエリも残す）', async () => {
  const res = await call(bases.on!, '/tasks?page=2', { proto: 'http', host: 'app.example.com' });
  assert.equal(res.status, 308);
  assert.equal(res.headers.get('location'), 'https://app.example.com/tasks?page=2');
});

test('http の HEAD も 308', async () => {
  const res = await call(bases.on!, '/', { method: 'HEAD', proto: 'http', host: 'app.example.com' });
  assert.equal(res.status, 308);
  assert.equal(res.headers.get('location'), 'https://app.example.com/');
});

test('http の POST・DELETE は送り直させず 400（ボディはもう暗号化されずに届いている）', async () => {
  for (const method of ['POST', 'DELETE']) {
    const res = await call(bases.on!, '/tasks', { method, proto: 'http', host: 'app.example.com' });
    assert.equal(res.status, 400, method);
    assert.equal(res.headers.get('location'), null, method);
    assert.equal(await res.text(), 'HTTPS で送ってください\n', method);
  }
});

test('/healthz と /readyz は、http のままでよい（既定）', async () => {
  for (const p of ['/healthz', '/readyz']) {
    const res = await call(bases.on!, p, { proto: 'http' });
    assert.equal(res.status, 200, p);
  }
  const res = await call(bases.on!, '/healthz/more', { proto: 'http', host: 'app.example.com' });
  assert.equal(res.status, 308, '/healthz/more はパスが違うので送り直す');
});

test('exempt を渡したら、そのパスだけ', async () => {
  assert.equal((await call(bases.custom!, '/ping', { proto: 'http' })).status, 200);
  assert.equal((await call(bases.custom!, '/healthz', { proto: 'http', host: 'app.example.com' })).status, 308);
});

test('enabled: false なら、http でも何もしない', async () => {
  const res = await call(bases.off!, '/tasks', { method: 'POST', proto: 'http' });
  assert.equal(res.status, 200);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
