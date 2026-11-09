// 練習問題3のテスト。Router を第17章の createApp で包んでサーバを起動し、fetch で確かめる
// 使い方: node --test router.test.mjs
//         MODULE=../solutions/router.mjs node --test router.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createApp } from '../../ch17-minimal-server/solutions/app.mjs';
import { sendJson, sendText } from '../../ch17-minimal-server/solutions/send.mjs';

const { Router } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './router.mjs')).href);

const calls = [];
const router = new Router()
  .get('/', (req, res) => sendText(res, 200, 'トップ'))
  .get('/users/:id', (req, res, params) => sendJson(res, 200, { route: 'user', params: { ...params }, reqParams: { ...req.params } }))
  .get('/users/me', (req, res) => sendJson(res, 200, { route: 'me' })) // 後から登録しても、:id より先に選ばれる
  .delete('/users/:id', (req, res, params) => sendJson(res, 200, { route: 'delete', id: params.id }))
  .get('/files/*', (req, res, params) => sendJson(res, 200, { rest: params['*'] }))
  .get('/search', (req, res) => sendJson(res, 200, { pathname: req.pathname, q: req.query.getAll('q') }))
  .post('/items', (req, res) => { calls.push('post'); sendJson(res, 201, { ok: true }); })
  .get('/items', (req, res) => sendJson(res, 200, []))
  .get('/head-check', (req, res) => { calls.push(req.method); sendText(res, 200, 'body'); })
  .get('/boom', async () => { throw new Error('ハンドラの中の失敗'); });

const quiet = { info() {}, error() {} };
const server = http.createServer(createApp(router.handle, { logger: quiet }));
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
test.after(() => { server.closeAllConnections(); server.close(); });

const get = (p, init = {}) => fetch(base + p, { redirect: 'manual', signal: AbortSignal.timeout(2000), ...init });

// fetch は "//evil.com" のようなパスを送れないので、生のバイト列で送る
function raw(target, method = 'GET') {
  return new Promise((resolve, reject) => {
    const sock = net.connect(port, '127.0.0.1', () => sock.write(`${method} ${target} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`));
    let data = '';
    sock.setTimeout(2000, () => sock.destroy(new Error('返事がありません')));
    sock.on('data', (d) => (data += d));
    sock.on('error', reject);
    sock.on('close', () => {
      const [head, body] = data.split('\r\n\r\n');
      const [status, ...lines] = head.split('\r\n');
      const headers = Object.fromEntries(lines.map((l) => [l.slice(0, l.indexOf(':')).toLowerCase(), l.slice(l.indexOf(':') + 1).trim()]));
      resolve({ status: Number(status.split(' ')[1]), headers, body });
    });
  });
}

test('静的なパスと、パラメータ。params は引数と req.params の両方で読める', async () => {
  assert.equal(await (await get('/')).text(), 'トップ');
  assert.deepEqual(await (await get('/users/42')).json(), { route: 'user', params: { id: '42' }, reqParams: { id: '42' } });
});

test('登録した順ではなく、具体的なものが選ばれる', async () => {
  assert.deepEqual(await (await get('/users/me')).json(), { route: 'me' });
});

test('同じパスでも、メソッドで選ぶ', async () => {
  assert.deepEqual(await (await get('/users/me', { method: 'DELETE' })).json(), { route: 'delete', id: 'me' });
  const r = await get('/items', { method: 'POST' });
  assert.equal(r.status, 201);
});

test('* とクエリ。req.pathname と req.query', async () => {
  assert.deepEqual(await (await get('/files/a/b.txt')).json(), { rest: 'a/b.txt' });
  assert.deepEqual(await (await get('/search?q=a+b&q=%E3%81%82')).json(), { pathname: '/search', q: ['a b', 'あ'] });
});

test('どれにもあてはまらなければ 404', async () => {
  const r = await get('/nothing');
  assert.equal(r.status, 404);
  assert.match(r.headers.get('content-type'), /application\/json/);
});

test('パスはあるがメソッドが違えば 405 と Allow', async () => {
  const r = await get('/users/42', { method: 'PUT' });
  assert.equal(r.status, 405);
  assert.equal(r.headers.get('allow'), 'GET, HEAD, DELETE, OPTIONS');
  const r2 = await get('/items', { method: 'DELETE' });
  assert.equal(r2.headers.get('allow'), 'GET, HEAD, POST, OPTIONS');
});

test('HEAD は GET のハンドラで答える。本文は無い', async () => {
  calls.length = 0;
  const r = await get('/head-check', { method: 'HEAD' });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), '');
  assert.deepEqual(calls, ['HEAD']);
});

test('OPTIONS は、ハンドラが無くても 204 と Allow を返す', async () => {
  const r = await get('/items', { method: 'OPTIONS' });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('allow'), 'GET, HEAD, POST, OPTIONS');
  assert.equal((await get('/nothing', { method: 'OPTIONS' })).status, 404);
});

test('最後の / だけが違うなら 308 で案内する。クエリは残す', async () => {
  const r = await get('/items/?page=2');
  assert.equal(r.status, 308);
  assert.equal(r.headers.get('location'), '/items?page=2');
  const r2 = await get('/files');
  assert.equal(r2.status, 308);
  assert.equal(r2.headers.get('location'), '/files/');
});

test('壊れた %xx は 400', async () => {
  const r = await get('/users/%E0%A4%A');
  assert.equal(r.status, 400);
});

test('"//evil.com/..." を別のホストとして読まない。別のサイトへ案内しない', async () => {
  const r = await raw('//evil.com/users/me');
  assert.equal(r.status, 404); // /users/me として扱わない
  const r2 = await raw('//evil.com/');
  assert.notEqual(r2.status, 308);
  assert.equal(r2.headers.location, undefined);
});

test('"/" で始まらない対象（http://... や *）は 400', async () => {
  assert.equal((await raw('http://localhost/users/me')).status, 400);
  assert.equal((await raw('*', 'OPTIONS')).status, 400);
});

test('/a/../users/me のような書き方は、URL の決まりどおりに直してから選ぶ', async () => {
  const r = await raw('/a/../users/me');
  assert.equal(r.status, 200);
  assert.deepEqual(JSON.parse(r.body), { route: 'me' });
});

test('ハンドラの失敗は、そのまま外に伝わる（createApp が 500 にする）', async () => {
  assert.equal((await get('/boom')).status, 500);
});
