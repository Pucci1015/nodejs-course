// 練習問題2 のテスト
// 使い方: node --test api-client.test.ts
//   模範解答を試す: MODULE=../solutions/api-client.ts node --test api-client.test.ts
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './api-client.ts');
const { createClient }: typeof import('./api-client.ts') = await import(pathToFileURL(file).href);

// 頼まれた内容を JSON で返すサーバ。/empty は 204、/text は文字列、/problem は problem+json、/slow は返事をしない
const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (chunk: Buffer) => (raw += chunk.toString()));
  req.on('end', () => {
    if (req.url === '/empty') return res.writeHead(204).end();
    if (req.url === '/text') return res.writeHead(200, { 'content-type': 'text/plain' }).end('こんにちは');
    if (req.url === '/problem') {
      return res.writeHead(404, { 'content-type': 'application/problem+json' }).end('{"title":"ない"}');
    }
    if (req.url === '/slow') return; // 返事をしない
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'x-test': 'yes' });
    res.end(JSON.stringify({ method: req.method, url: req.url, contentType: req.headers['content-type'] ?? null, raw }));
  });
});
let base: string;
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => {
  server.closeAllConnections();
  server.close();
});

test('get: 状態・ヘッダ・JSON の本文', async () => {
  const res = await createClient(base).get('/api/tasks?limit=2');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-test'), 'yes');
  assert.deepEqual(res.body, { method: 'GET', url: '/api/tasks?limit=2', contentType: null, raw: '' });
});

test('post・put: 本文を JSON にして、content-type を付けて送る', async () => {
  const client = createClient(base);
  const posted = await client.post('/api/tasks', { title: '牛乳' });
  assert.deepEqual(posted.body, { method: 'POST', url: '/api/tasks', contentType: 'application/json', raw: '{"title":"牛乳"}' });
  const put = await client.put('/api/tasks/1/status', { status: 'done' });
  assert.deepEqual(put.body, { method: 'PUT', url: '/api/tasks/1/status', contentType: 'application/json', raw: '{"status":"done"}' });
});

test('delete: 本文なしで送る', async () => {
  const res = await createClient(base).delete('/api/tasks/1');
  assert.deepEqual(res.body, { method: 'DELETE', url: '/api/tasks/1', contentType: null, raw: '' });
});

test('本文が空なら undefined、JSON でなければ文字列、problem+json も JSON として読む', async () => {
  const client = createClient(base);
  const empty = await client.get('/empty');
  assert.equal(empty.status, 204);
  assert.equal(empty.body, undefined);
  assert.equal((await client.get('/text')).body, 'こんにちは');
  const problem = await client.get('/problem');
  assert.equal(problem.status, 404);
  assert.deepEqual(problem.body, { title: 'ない' });
});

test('返事が来なければ timeoutMs で失敗する', async () => {
  const started = Date.now();
  await assert.rejects(createClient(base, { timeoutMs: 200 }).get('/slow'));
  assert.ok(Date.now() - started < 2000, '2 秒以内に失敗する');
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
