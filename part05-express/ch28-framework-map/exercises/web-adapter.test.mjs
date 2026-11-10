// 練習問題7のテスト
// 使い方: node --test web-adapter.test.mjs
//         MODULE=../solutions/web-adapter.mjs node --test web-adapter.test.mjs   （解答例で確かめる）
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { toNodeHandler } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './web-adapter.mjs')).href);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let seen; // ハンドラが受け取った Request の中身
let aborted = false;
let cancelled = false;

async function handle(request) {
  const { pathname } = new URL(request.url);
  if (pathname === '/echo') {
    seen = { method: request.method, url: request.url, tag: request.headers.get('x-tag'), body: await request.text() };
    return Response.json(seen);
  }
  if (pathname === '/cookies') {
    const h = new Headers({ 'Content-Type': 'text/plain' });
    h.append('Set-Cookie', 'a=1; Path=/; HttpOnly');
    h.append('Set-Cookie', 'b=2; Path=/; Expires=Thu, 01 Jan 2099 00:00:00 GMT');
    return new Response('ok', { headers: h });
  }
  if (pathname === '/stream') {
    // 1つ目をすぐ、2つ目を 400ms 後に送る
    let timer;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('first\n'));
        timer = setTimeout(() => {
          controller.enqueue(new TextEncoder().encode('second\n'));
          controller.close();
        }, 400);
      },
      cancel() {
        clearTimeout(timer);
        cancelled = true;
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/plain' } });
  }
  if (pathname === '/slow') {
    request.signal.addEventListener('abort', () => (aborted = true));
    await sleep(500);
    return new Response('late');
  }
  if (pathname === '/empty') return new Response(null, { status: 204 });
  if (pathname === '/boom') throw new Error('boom');
  return new Response('not found', { status: 404, statusText: 'Nope' });
}

const server = http.createServer(toNodeHandler(handle));
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
after(() => {
  server.closeAllConnections();
  server.close();
});

/** 生の HTTP で送る（同じ名前のヘッダを2つ送るため） */
function raw(text) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let out = '';
    socket.connect(server.address().port, '127.0.0.1', () => socket.end(text));
    socket.on('data', (d) => (out += d)).on('end', () => resolve(out)).on('error', reject);
  });
}

test('1. メソッド・URL（クエリつき）・ボディが届く', async () => {
  const r = await fetch(`${base}/echo?x=1`, { method: 'POST', body: 'こんにちは', signal: AbortSignal.timeout(2000) });
  assert.deepEqual(await r.json(), { method: 'POST', url: `${base}/echo?x=1`, tag: null, body: 'こんにちは' });
});

test('2. 同じ名前のヘッダが2つあれば、両方届く', async () => {
  await raw('GET /echo HTTP/1.1\r\nHost: example.test\r\nX-Tag: a\r\nX-Tag: b\r\nConnection: close\r\n\r\n');
  assert.equal(seen.tag, 'a, b');
  assert.equal(seen.url, 'http://example.test/echo');
});

test('3. Set-Cookie が2つなら、2行で送る（日付の中の , で分けない）', async () => {
  const r = await fetch(`${base}/cookies`, { signal: AbortSignal.timeout(2000) });
  assert.deepEqual(r.headers.getSetCookie(), ['a=1; Path=/; HttpOnly', 'b=2; Path=/; Expires=Thu, 01 Jan 2099 00:00:00 GMT']);
});

test('4. 本文はためずに送る（1つ目は、2つ目より前に届く）', async () => {
  const t = Date.now();
  const r = await fetch(`${base}/stream`, { signal: AbortSignal.timeout(2000) });
  const reader = r.body.getReader();
  const first = await reader.read();
  assert.equal(new TextDecoder().decode(first.value), 'first\n');
  assert.ok(Date.now() - t < 300, `1つ目が届くまで ${Date.now() - t}ms かかった（ためている）`);
  let rest = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    rest += new TextDecoder().decode(value);
  }
  assert.equal(rest, 'second\n');
});

test('5. 客が途中で切ったら、本文の ReadableStream を cancel する', async () => {
  cancelled = false;
  const ac = new AbortController();
  const r = await fetch(`${base}/stream`, { signal: ac.signal });
  await r.body.getReader().read();
  ac.abort();
  await sleep(150);
  assert.equal(cancelled, true);
});

test('6. 応答の前に客が切ったら、request.signal が abort される', async () => {
  aborted = false;
  const ac = new AbortController();
  const p = fetch(`${base}/slow`, { signal: ac.signal }).catch(() => {});
  await sleep(100);
  ac.abort();
  await p;
  await sleep(100);
  assert.equal(aborted, true);
});

test('7. HEAD は本文を送らない。204 も送れる。statusText も渡す', async () => {
  const head = await raw('HEAD /cookies HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n');
  assert.ok(head.startsWith('HTTP/1.1 200'), head);
  assert.ok(!head.endsWith('ok'), '本文を送っている');
  assert.equal((await fetch(`${base}/empty`, { signal: AbortSignal.timeout(2000) })).status, 204);
  const nf = await raw('GET /nothing HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n');
  assert.ok(nf.startsWith('HTTP/1.1 404 Nope'), nf.split('\r\n')[0]);
});

test('8. ハンドラが投げたら 500', async () => {
  assert.equal((await fetch(`${base}/boom`, { signal: AbortSignal.timeout(2000) })).status, 500);
});
