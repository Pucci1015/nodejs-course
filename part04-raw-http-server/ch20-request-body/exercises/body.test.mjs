// 練習問題5のテスト。ハンドラの中で readBody などを呼ぶサーバを起動して、fetch と生の TCP で確かめる
// 使い方: node --test body.test.mjs
//         MODULE=../solutions/body.mjs node --test body.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { createApp } from '../../ch17-minimal-server/solutions/app.mjs';
import { sendJson } from '../../ch17-minimal-server/solutions/send.mjs';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './body.mjs')).href);

const LIMIT = 1000;
const events = []; // readBody が失敗したときの記録（客が先に切ったときのテスト用）
const routes = {
  '/body': async (req) => ({ size: (await m.readBody(req, { limit: LIMIT })).length }),
  '/text': async (req) => ({ text: await m.readText(req, { limit: LIMIT }) }),
  '/json': async (req) => ({ json: await m.readJson(req, { limit: LIMIT }) }),
  '/form': async (req) => {
    const p = await m.readForm(req, { limit: LIMIT });
    return { name: p.get('name'), tags: p.getAll('tags') };
  },
  '/type': async (req) => m.mediaType(req),
  '/slow': async (req) => {
    try {
      await m.readBody(req, { limit: LIMIT });
      events.push('読めた');
    } catch (err) {
      events.push(`失敗: ${err.message}`);
      throw err;
    }
    return {};
  },
};
const quiet = { info() {}, error() {} };
const server = http.createServer(createApp(async (req, res) => {
  const result = await routes[new URL(`http://localhost${req.url}`).pathname](req);
  sendJson(res, 200, result);
}, { logger: quiet }));
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
test.after(() => { server.closeAllConnections(); server.close(); });

const post = (p, body, type) => fetch(base + p, {
  method: 'POST',
  body,
  headers: type ? { 'Content-Type': type } : {},
  signal: AbortSignal.timeout(3000),
});

// 生の TCP で送り、返事のステータス行と、接続が閉じられたかを返す
function raw(head, parts, { delay = 20 } = {}) {
  return new Promise((resolve, reject) => {
    const sock = net.connect(port, '127.0.0.1', async () => {
      sock.write(head);
      for (const p of parts) {
        if (sock.destroyed) break;
        sock.write(p);
        await sleep(delay);
      }
    });
    let data = '';
    sock.setTimeout(3000, () => { sock.destroy(); resolve({ data, closed: false }); });
    sock.on('data', (d) => (data += d));
    sock.on('error', () => {});
    sock.on('close', () => resolve({ status: Number(data.split(' ')[1]), data, closed: true }));
  });
}

test('readBody: Buffer で全部返す', async () => {
  const r = await post('/body', 'x'.repeat(500), 'application/octet-stream');
  assert.deepEqual(await r.json(), { size: 500 });
});

test('readBody: Content-Length が上限を超えていたら、読まずに 413 と Connection: close', async () => {
  const r = await post('/body', 'x'.repeat(LIMIT + 1), 'application/octet-stream');
  assert.equal(r.status, 413);
  assert.equal(r.headers.get('connection'), 'close');
});

test('readBody: Content-Length の無い（chunked の）ボディも、読んだ量で 413', async () => {
  const head = `POST /body HTTP/1.1\r\nHost: x\r\nTransfer-Encoding: chunked\r\nContent-Type: application/octet-stream\r\n\r\n`;
  const chunk = (s) => `${s.length.toString(16)}\r\n${s}\r\n`;
  const parts = [chunk('a'.repeat(600)), chunk('b'.repeat(600)), chunk('c'.repeat(600)), '0\r\n\r\n'];
  const r = await raw(head, parts);
  assert.equal(r.status, 413);
  assert.match(r.data, /connection: close/i);
  assert.ok(r.closed, 'サーバが接続を閉じていません');
});

test('readBody: 上限ちょうどは読める', async () => {
  const r = await post('/body', 'x'.repeat(LIMIT), 'application/octet-stream');
  assert.equal(r.status, 200);
});

test('readBody: 送り終える前に客が切ったら失敗する（待ち続けない）', async () => {
  events.length = 0;
  await new Promise((resolve) => {
    const sock = net.connect(port, '127.0.0.1', () => {
      sock.write(`POST /slow HTTP/1.1\r\nHost: x\r\nContent-Length: 500\r\nContent-Type: text/plain\r\n\r\n${'y'.repeat(100)}`);
      setTimeout(() => { sock.destroy(); resolve(); }, 50);
    });
  });
  for (let i = 0; i < 50 && events.length === 0; i++) await sleep(20);
  assert.equal(events.length, 1, 'readBody が終わっていません');
  assert.match(events[0], /^失敗/);
});

test('readText: 文字に戻すのは全部そろってから（チャンクの境目で文字が切れても大丈夫）', async () => {
  const body = Buffer.from('あいう');
  const head = `POST /text HTTP/1.1\r\nHost: x\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${body.length}\r\nConnection: close\r\n\r\n`;
  const r = await raw(head, [body.subarray(0, 4), body.subarray(4)], { delay: 50 });
  assert.equal(r.status, 200);
  assert.match(r.data, /"text":"あいう"/);
});

test('readText: UTF-8 として正しくないバイト列は 400。UTF-8 以外の charset は 415', async () => {
  assert.equal((await post('/text', new Uint8Array([0xe3, 0x81]), 'text/plain')).status, 400);
  assert.equal((await post('/text', 'abc', 'text/plain; charset=shift_jis')).status, 415);
  assert.equal((await post('/text', 'abc', 'text/plain; charset=UTF-8')).status, 200);
});

test('readJson: application/json と +json', async () => {
  assert.deepEqual(await (await post('/json', '{"a":[1,"あ"]}', 'application/json')).json(), { json: { a: [1, 'あ'] } });
  assert.deepEqual(await (await post('/json', '{"a":1}', 'Application/JSON; charset=utf-8')).json(), { json: { a: 1 } });
  assert.deepEqual(await (await post('/json', '{"a":1}', 'application/merge-patch+json')).json(), { json: { a: 1 } });
});

test('readJson: Content-Type が違えば 415。無くても 415', async () => {
  assert.equal((await post('/json', '{"a":1}', 'text/plain')).status, 415);
  assert.equal((await post('/json', '{"a":1}', 'application/x-www-form-urlencoded')).status, 415);
  assert.equal((await post('/json', new Blob(['{"a":1}']))).status, 415);
});

test('readJson: 読めない JSON・空のボディは 400', async () => {
  for (const body of ['{"a":', '', '   ', "{'a':1}", '{"a":1,}']) {
    assert.equal((await post('/json', body, 'application/json')).status, 400, JSON.stringify(body));
  }
});

test('readJson: 上限を超えたら 413', async () => {
  assert.equal((await post('/json', JSON.stringify({ s: 'x'.repeat(LIMIT) }), 'application/json')).status, 413);
});

test('readForm: URLSearchParams で返す。+ は空白', async () => {
  const r = await post('/form', 'name=%E3%82%8A+%E3%82%87%E3%81%86&tags=a&tags=b', 'application/x-www-form-urlencoded');
  assert.deepEqual(await r.json(), { name: 'り ょう', tags: ['a', 'b'] });
  assert.equal((await post('/form', 'name=x', 'application/json')).status, 415);
});

test('mediaType: 小文字にして、パラメータに分ける', async () => {
  const r = await post('/type', 'x', 'Text/HTML; Charset="UTF-8"; boundary=abc');
  assert.deepEqual(await r.json(), { type: 'text/html', params: { charset: 'UTF-8', boundary: 'abc' } });
  const r2 = await post('/type', new Blob(['x']));
  assert.deepEqual(await r2.json(), { type: '', params: {} });
});
