// 練習問題7のテスト
// 使い方: node --test request-logger.test.mjs
//         MODULE=../solutions/request-logger.mjs node --test request-logger.test.mjs   （解答例で確かめる）
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';

const { requestLogger, redactUrl } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './request-logger.mjs')).href);

/** pino の代わりの、書いたものを覚えるだけのロガー */
const records = [];
function fakeLogger(bindings = {}) {
  const write = (level) => (obj, msg) => records.push({ level, bindings, obj, msg });
  return { child: (b) => fakeLogger({ ...bindings, ...b }), info: write('info'), warn: write('warn'), error: write('error'), debug: write('debug') };
}
let clock = 0; // now() が返す値。ハンドラの中で進める

const app = express();
app.set('env', 'test');
app.use(requestLogger({ logger: fakeLogger({ app: 'test' }), now: () => clock, genId: () => 'generated-id' }));
app.get('/ok', (req, res) => {
  clock += 12.4;
  req.log.info({ step: 1 }, 'ハンドラの中');
  res.json({ id: req.id });
});
app.get('/missing', (req, res) => res.status(404).json({ error: 'not_found' }));
app.get('/boom', () => {
  throw new Error('boom');
});
app.get('/hang', (req, res) => res.write('途中まで')); // 終わらない
const api = express.Router();
api.get('/x', (req, res) => res.send('x'));
app.use('/api', api);
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => res.status(500).json({ error: 'internal' }));

let server;
let base;
before(async () => {
  await new Promise((r) => {
    server = app.listen(0, '127.0.0.1', r);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.closeAllConnections();
  server.close();
});
beforeEach(() => {
  records.length = 0;
  clock = 0;
});

const get = (url, headers = {}) => fetch(base + url, { headers, signal: AbortSignal.timeout(2000) });
/** close の後に書かれるので、少し待ってから見る */
const settle = () => new Promise((r) => setTimeout(r, 50));
const requestLines = () => records.filter((r) => r.msg === 'request');

test('1. 応答の後に1行だけ。status と ms（四捨五入）', async () => {
  await (await get('/ok')).text();
  await settle();
  const lines = requestLines();
  assert.equal(lines.length, 1);
  assert.deepEqual(lines[0].obj, { method: 'GET', url: '/ok', status: 200, ms: 12 });
  assert.equal(lines[0].level, 'info');
});

test('2. id が無ければ作り、X-Request-Id で返す。ログの bindings に reqId', async () => {
  const res = await get('/ok');
  assert.equal(res.headers.get('x-request-id'), 'generated-id');
  assert.deepEqual(await res.json(), { id: 'generated-id' });
  await settle();
  assert.deepEqual(requestLines()[0].bindings, { app: 'test', reqId: 'generated-id' });
});

test('3. 形の正しい X-Request-Id は使い、正しくないものは作り直す', async () => {
  assert.equal((await get('/ok', { 'x-request-id': 'abc-123_x.y' })).headers.get('x-request-id'), 'abc-123_x.y');
  for (const bad of ['a b', 'x'.repeat(65), '<script>', '']) {
    assert.equal((await get('/ok', { 'x-request-id': bad })).headers.get('x-request-id'), 'generated-id', `「${bad}」`);
  }
});

test('4. ハンドラの中の req.log にも reqId が付く', async () => {
  await (await get('/ok', { 'x-request-id': 'req-4' })).text();
  const inner = records.find((r) => r.msg === 'ハンドラの中');
  assert.ok(inner, 'req.log が無い');
  assert.equal(inner.bindings.reqId, 'req-4');
});

test('5. 4xx は warn、5xx は error', async () => {
  await (await get('/missing')).text();
  await (await get('/boom')).text();
  await settle();
  assert.deepEqual(requestLines().map((r) => [r.obj.status, r.level]), [
    [404, 'warn'],
    [500, 'error'],
  ]);
});

test('6. 客が先に切ったら status は aborted（error）', async () => {
  await new Promise((resolve) => {
    const req = http.get(`${base}/hang`, (res) => {
      res.once('data', () => {
        req.destroy();
        resolve();
      });
    });
  });
  await settle();
  const line = requestLines()[0];
  assert.equal(line?.obj.status, 'aborted');
  assert.equal(line.level, 'error');
});

test('7. url は originalUrl で、秘密のクエリは隠す', async () => {
  await (await get('/api/x?token=abc&q=1&Password=p')).text();
  await settle();
  assert.equal(requestLines()[0].obj.url, '/api/x?token=[redacted]&q=1&Password=[redacted]');
});

test('8. redactUrl: クエリの無い URL、同じ名前が2回、名前が完全に同じものだけ', () => {
  assert.equal(redactUrl('/a/b'), '/a/b');
  assert.equal(redactUrl('/a?code=1&code=2'), '/a?code=[redacted]');
  assert.equal(redactUrl('/a?tokens=1&mykey=2'), '/a?tokens=1&mykey=2');
});
