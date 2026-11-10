// 練習問題3 用: safe.mjs のテスト
// 使い方: node --test safe.test.mjs
//   模範解答を試す: MODULE=../solutions/safe.mjs node --test safe.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './safe.mjs')).href);

// テストの表示を汚さないよう、console.error に書かれたものは配列に集める
const errors = [];
console.error = (...args) => errors.push(args.map(String).join(' '));

async function handler(req, res) {
  if (req.url === '/sync') throw new Error('同期の例外（秘密の中身）');
  if (req.url === '/async') {
    await new Promise((r) => setTimeout(r, 10));
    throw new Error('async の失敗（秘密の中身）');
  }
  if (req.url === '/half') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.write('途中まで');
    throw new Error('返している途中の失敗');
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('ok');
}

const wrapped = m.safe(handler);
assert.equal(typeof wrapped, 'function', 'safe(handler) は関数を返す');
const server = http.createServer(wrapped);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => { server.closeAllConnections(); server.close(); });

const get = (p) => fetch(base + p, { signal: AbortSignal.timeout(2000) });

test('失敗しなければ、ハンドラの返事がそのまま届く', async () => {
  const r = await get('/');
  assert.equal(r.status, 200);
  assert.equal(await r.text(), 'ok');
});

test('同期の例外は 500 と決まった文。例外の中身は客に見せない', async () => {
  const r = await get('/sync');
  assert.equal(r.status, 500);
  assert.equal(r.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(await r.text(), 'サーバの中でエラーが起きました\n');
});

test('async の失敗も 500', async () => {
  const r = await get('/async');
  assert.equal(r.status, 500);
  assert.equal(await r.text(), 'サーバの中でエラーが起きました\n');
});

test('エラーの後も、サーバは動き続ける', async () => {
  await get('/sync');
  await get('/async');
  assert.equal(await (await get('/')).text(), 'ok');
});

test('例外の中身は、console.error（サーバのログ）に書く', async () => {
  errors.length = 0;
  await get('/sync');
  assert.ok(errors.some((e) => e.includes('同期の例外')), `console.error に書かれたもの: ${JSON.stringify(errors)}`);
});

test('返している途中で失敗したら、接続を切る（500 は返せない）', async () => {
  const r = await get('/half');
  assert.equal(r.status, 200);
  await assert.rejects(r.text(), '本文を最後まで読めずに失敗するはず');
});
