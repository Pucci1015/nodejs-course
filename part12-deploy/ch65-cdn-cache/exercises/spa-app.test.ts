// 練習問題7 のテスト（一時フォルダに dist を作り、空いているポートでアプリを動かす）
// 使い方: node --test spa-app.test.ts
//   模範解答を試す: MODULE=../solutions/spa-app.ts node --test spa-app.test.ts
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import http, { type Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './spa-app.ts');
const { createSpaApp }: typeof import('./spa-app.ts') = await import(pathToFileURL(file).href);

let dir = '';
let server: Server;
let base = '';
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'spa-'));
  await fs.mkdir(path.join(dir, 'assets'));
  await fs.writeFile(path.join(dir, 'index.html'), '<!doctype html><title>画面</title><div id="root"></div>\n');
  await fs.writeFile(path.join(dir, 'assets', 'index-C4mP8sLa.js'), 'console.log(1);\n');
  await fs.writeFile(path.join(dir, 'robots.txt'), 'User-agent: *\n');
  server = createSpaApp(dir).listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => {
  server.close();
  await fs.rm(dir, { recursive: true, force: true });
});

const get = (p: string, init: RequestInit = {}) => fetch(base + p, { redirect: 'manual', signal: AbortSignal.timeout(3000), ...init });

test('/ と画面の中の URL は index.html を no-cache で', async () => {
  for (const p of ['/', '/tasks/12', '/login']) {
    const r = await get(p);
    assert.equal(r.status, 200, p);
    assert.equal(r.headers.get('cache-control'), 'no-cache', p);
    assert.match(r.headers.get('content-type') ?? '', /^text\/html/, p);
    assert.match(await r.text(), /<div id="root">/, p);
  }
});

test('ハッシュ付きのファイルは 1 年・immutable', async () => {
  const r = await get('/assets/index-C4mP8sLa.js');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.equal(await r.text(), 'console.log(1);\n');
});

test('無いファイル（/assets の中も外も）は 404 で no-store。index.html を返さない', async () => {
  for (const p of ['/assets/index-OLD12345.js', '/assets/nothing', '/favicon.ico', '/old/page.html']) {
    const r = await get(p);
    assert.equal(r.status, 404, p);
    assert.equal(r.headers.get('cache-control'), 'no-store', p);
    assert.doesNotMatch(await r.text(), /<div id="root">/, p);
  }
});

test('/api の下は、無ければ JSON の 404 で no-store', async () => {
  for (const p of ['/api', '/api/nothing', '/api/tasks/1']) {
    const r = await get(p);
    assert.equal(r.status, 404, p);
    assert.equal(r.headers.get('cache-control'), 'no-store', p);
    assert.match(r.headers.get('content-type') ?? '', /^application\/json/, p);
  }
});

test('/index.html は / へ 301', async () => {
  const r = await get('/index.html');
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), '/');
});

test('robots.txt は public, max-age=0。どの応答にも nosniff、X-Powered-By は無い', async () => {
  const r = await get('/robots.txt');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('cache-control'), 'public, max-age=0');
  for (const p of ['/robots.txt', '/', '/api/x', '/assets/none.js']) {
    const x = await get(p);
    assert.equal(x.headers.get('x-content-type-options'), 'nosniff', p);
    assert.equal(x.headers.get('x-powered-by'), null, p);
  }
});

/** If-None-Match を付けた GET のステータス。fetch は If-None-Match を付けると Cache-Control: no-cache も足すので、node:http で送る */
function conditionalStatus(p: string, etag: string): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    http.get(base + p, { headers: { 'If-None-Match': etag }, timeout: 3000 }, (res) => {
      res.resume();
      resolve(res.statusCode);
    }).on('error', reject);
  });
}

test('ETag で 304 が返る（index.html とファイル）', async () => {
  for (const p of ['/', '/tasks/12', '/assets/index-C4mP8sLa.js']) {
    const etag = (await get(p)).headers.get('etag');
    assert.ok(etag, p);
    assert.equal(await conditionalStatus(p, etag), 304, p);
  }
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
