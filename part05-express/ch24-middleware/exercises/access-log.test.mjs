// 練習問題4のテスト
// 使い方: node --test access-log.test.mjs
//         MODULE=../solutions/access-log.mjs node --test access-log.test.mjs   （解答例で確かめる）
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import express from 'express';

const { accessLog } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './access-log.mjs')).href);

const entries = [];
const clock = { t: 0 };
const app = express();
app.set('env', 'test');
app.use((req, res, next) => {
  req.id = 'req-1';
  next();
});
app.use(accessLog({ write: (e) => entries.push(e), now: () => clock.t }));
app.get('/ok', (req, res) => {
  clock.t += 12.4;
  res.send('こんにちは'); // 15 バイト
});
app.get('/missing', (req, res) => res.status(404).json({ error: 'not_found' }));
app.get('/stream', (req, res) => {
  res.write('abc');
  res.write(Buffer.from('de'));
  res.end('f');
});
app.get('/slow', async (req, res) => {
  await sleep(300);
  if (!res.destroyed) res.send('slow');
});
app.get('/fail', () => {
  throw new Error('x');
});
app.use((err, req, res, next) => res.status(500).send('error'));

let server;
let base;
before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.closeAllConnections();
  server.close();
});
beforeEach(() => {
  entries.length = 0;
  clock.t = 0;
});

const get = async (p, method = 'GET') => {
  const res = await fetch(base + p, { method, signal: AbortSignal.timeout(2000) });
  await res.arrayBuffer();
  await sleep(30); // close のイベントを待つ
  return res;
};

test('1. 応答が終わった後に1回だけ書く。method・path・status・ms・bytes・id', async () => {
  await get('/ok');
  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0], { method: 'GET', path: '/ok', status: 200, ms: 12, bytes: 15, id: 'req-1' });
});

test('2. status は、ハンドラが決めた後の値（404・500）', async () => {
  await get('/missing');
  await get('/fail');
  assert.deepEqual(entries.map((e) => e.status), [404, 500]);
});

test('3. bytes は、実際に送った本文のバイト数（write を何回かに分けても、Buffer でも）', async () => {
  await get('/stream');
  assert.equal(entries[0].bytes, 6);
});

test('4. HEAD は本文を送らないので bytes は 0', async () => {
  await get('/ok', 'HEAD');
  assert.equal(entries[0].bytes, 0);
});

test('5. 客が先に切ったら status は "aborted"', async () => {
  await new Promise((resolve) => {
    const socket = net.connect(server.address().port, '127.0.0.1', () => {
      socket.write('GET /slow HTTP/1.1\r\nHost: localhost\r\n\r\n');
      setTimeout(() => socket.destroy(), 50);
      setTimeout(resolve, 150);
    });
  });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].status, 'aborted');
  assert.equal(entries[0].path, '/slow');
});

test('6. クエリの token・password・secret・code・key の値は [redacted] にする（ほかは残す）', async () => {
  await get('/ok?q=牛乳&token=abc123&Password=p&code=9&page=2&apikey=k');
  const p = entries[0].path;
  assert.ok(!p.includes('abc123'), p);
  assert.ok(!p.includes('Password=p'), p);
  assert.ok(p.startsWith('/ok?'), p);
  const q = new URLSearchParams(p.slice(4));
  assert.equal(q.get('q'), '牛乳');
  assert.equal(q.get('token'), '[redacted]');
  assert.equal(q.get('Password'), '[redacted]');
  assert.equal(q.get('code'), '[redacted]');
  assert.equal(q.get('page'), '2');
  assert.equal(q.get('apikey'), 'k', '名前が完全に同じものだけ（大文字・小文字は区別しない）');
});

test('7. とても長い path は 200 文字で切り、最後に … を付ける', async () => {
  await get(`/ok?q=${'a'.repeat(500)}`);
  assert.equal(entries[0].path.length, 201);
  assert.ok(entries[0].path.endsWith('…'));
});
