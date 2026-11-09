// 練習問題3のテスト。一時フォルダにファイルを作り、serveStatic を createApp で包んだサーバで確かめる
// 使い方: node --test static.test.mjs
//         MODULE=../solutions/static.mjs node --test static.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createApp } from '../../ch17-minimal-server/solutions/app.mjs';

const { serveStatic } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './static.mjs')).href);

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ch19-static-'));
const root = path.join(tmp, 'public');
const files = {
  'index.html': '<!doctype html><title>top</title>',
  'hello.txt': 'こんにちは\n',
  'style.css': 'h1 { color: blue }',
  'docs/index.html': '<p>docs</p>',
  'A.txt': 'A です',
  '%41.txt': '%41 という名前のファイル',
  '.secret': 'ひみつ',
  'empty.txt': '',
};
for (const [name, body] of Object.entries(files)) {
  await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
  await fs.writeFile(path.join(root, name), body);
}
await fs.writeFile(path.join(tmp, 'outside.txt'), '外');
const big = Buffer.alloc(3 * 1024 * 1024, 'abcdefghij'); // 3MB
await fs.writeFile(path.join(root, 'big.bin'), big);

const quiet = { info() {}, error() {} };
async function startServer(handler) {
  const server = http.createServer(createApp(handler, { logger: quiet }));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return server;
}
const server = await startServer(serveStatic(root));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
const mounted = await startServer(serveStatic(root, {
  mount: '/static',
  cacheControl: (file) => (file.endsWith('.html') ? 'no-cache' : 'public, max-age=3600'),
}));
const mbase = `http://127.0.0.1:${mounted.address().port}`;
test.after(async () => {
  for (const s of [server, mounted]) { s.closeAllConnections(); s.close(); }
  await fs.rm(tmp, { recursive: true, force: true });
});

const get = (url, init = {}) => fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(3000), ...init });
function raw(target) {
  return new Promise((resolve, reject) => {
    const sock = net.connect(port, '127.0.0.1', () => sock.write(`GET ${target} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`));
    let data = '';
    sock.setTimeout(3000, () => sock.destroy(new Error('返事がありません')));
    sock.on('data', (d) => (data += d));
    sock.on('error', reject);
    sock.on('close', () => resolve(Number(data.split(' ')[1])));
  });
}

test('ファイルを返す。Content-Type・バイト数の Content-Length・nosniff', async () => {
  const r = await get(`${base}/hello.txt`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(r.headers.get('content-length'), String(Buffer.byteLength(files['hello.txt'])));
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(await r.text(), files['hello.txt']);
  assert.equal((await get(`${base}/style.css`)).headers.get('content-type'), 'text/css; charset=utf-8');
});

test('クエリが付いていても同じファイル', async () => {
  assert.equal(await (await get(`${base}/style.css?v=123`)).text(), files['style.css']);
});

test('/ と フォルダ/ は index.html。最後の / が無ければ 308（クエリは残す）', async () => {
  assert.equal(await (await get(`${base}/`)).text(), files['index.html']);
  assert.equal(await (await get(`${base}/docs/`)).text(), files['docs/index.html']);
  const r = await get(`${base}/docs?x=1`);
  assert.equal(r.status, 308);
  assert.equal(r.headers.get('location'), '/docs/?x=1');
});

test('外・. で始まる名前・無いものは、403・404・404', async () => {
  assert.equal(await raw('/..%2Foutside.txt'), 403);
  assert.equal((await get(`${base}/.secret`)).status, 404);
  assert.equal((await get(`${base}/nothing.txt`)).status, 404);
});

test('%xx を戻すのは1回だけ', async () => {
  assert.equal(await (await get(`${base}/%2541.txt`)).text(), files['%41.txt']);
  assert.equal(await (await get(`${base}/%41.txt`)).text(), files['A.txt']);
});

test('GET と HEAD 以外は 405 と Allow: GET, HEAD', async () => {
  const r = await get(`${base}/hello.txt`, { method: 'POST' });
  assert.equal(r.status, 405);
  assert.equal(r.headers.get('allow'), 'GET, HEAD');
});

test('HEAD は GET と同じヘッダで、本文は無い', async () => {
  const g = await get(`${base}/hello.txt`);
  const h = await get(`${base}/hello.txt`, { method: 'HEAD' });
  for (const name of ['content-type', 'content-length', 'etag', 'last-modified']) {
    assert.equal(h.headers.get(name), g.headers.get(name), name);
  }
  assert.equal(await h.text(), '');
});

test('空のファイルと、大きなファイル', async () => {
  const e = await get(`${base}/empty.txt`);
  assert.equal(e.status, 200);
  assert.equal(e.headers.get('content-length'), '0');
  assert.equal(await e.text(), '');
  const b = await get(`${base}/big.bin`);
  assert.equal(b.headers.get('content-type'), 'application/octet-stream');
  assert.ok(Buffer.from(await b.arrayBuffer()).equals(big));
});

test('ETag と Last-Modified。既定の Cache-Control は no-cache', async () => {
  const r = await get(`${base}/hello.txt`);
  assert.ok(r.headers.get('etag'), 'ETag がありません');
  assert.match(r.headers.get('etag'), /^(W\/)?"[^"]+"$/);
  assert.ok(!Number.isNaN(Date.parse(r.headers.get('last-modified'))), 'Last-Modified が日付ではありません');
  assert.equal(r.headers.get('cache-control'), 'no-cache');
});

test('If-None-Match が合えば 304。本文は無く、ETag は付ける', async () => {
  const etag = (await get(`${base}/hello.txt`)).headers.get('etag');
  for (const inm of [etag, `"x", ${etag}`, etag.replace(/^W\//, ''), '*']) {
    const r = await get(`${base}/hello.txt`, { headers: { 'If-None-Match': inm } });
    assert.equal(r.status, 304, inm);
    assert.equal(r.headers.get('etag'), etag);
    assert.equal(await r.text(), '');
  }
  assert.equal((await get(`${base}/hello.txt`, { headers: { 'If-None-Match': '"other"' } })).status, 200);
});

test('If-Modified-Since: 更新が無ければ 304。If-None-Match があれば、そちらを優先', async () => {
  const lm = (await get(`${base}/hello.txt`)).headers.get('last-modified');
  assert.equal((await get(`${base}/hello.txt`, { headers: { 'If-Modified-Since': lm } })).status, 304);
  assert.equal((await get(`${base}/hello.txt`, { headers: { 'If-Modified-Since': 'Mon, 01 Jan 1990 00:00:00 GMT' } })).status, 200);
  assert.equal((await get(`${base}/hello.txt`, { headers: { 'If-Modified-Since': 'yesterday' } })).status, 200);
  assert.equal((await get(`${base}/hello.txt`, { headers: { 'If-Modified-Since': lm, 'If-None-Match': '"other"' } })).status, 200);
});

test('ファイルが変わると、ETag も変わる', async () => {
  const before = (await get(`${base}/style.css`)).headers.get('etag');
  await fs.writeFile(path.join(root, 'style.css'), 'h1 { color: red }   ');
  const later = new Date(Date.now() + 5000);
  await fs.utimes(path.join(root, 'style.css'), later, later);
  const r = await get(`${base}/style.css`, { headers: { 'If-None-Match': before } });
  assert.equal(r.status, 200);
  assert.notEqual(r.headers.get('etag'), before);
});

test('mount と、関数の cacheControl', async () => {
  const r = await get(`${mbase}/static/hello.txt`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('cache-control'), 'public, max-age=3600');
  assert.equal((await get(`${mbase}/static/`)).headers.get('cache-control'), 'no-cache');
  assert.equal((await get(`${mbase}/hello.txt`)).status, 404);
  assert.equal((await get(`${mbase}/statichello.txt`)).status, 404);
  const d = await get(`${mbase}/static/docs`);
  assert.equal(d.status, 308);
  assert.equal(d.headers.get('location'), '/static/docs/');
});
