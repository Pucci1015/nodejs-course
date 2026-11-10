// 練習問題5のテスト。サーバを空いているポート（0）で起動して、fetch で確かめる
// 使い方: node --test app.test.mjs
//         MODULE=../solutions/app.mjs node --test app.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const { createApp, HttpError } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './app.mjs')).href);

// ログを集める偽物の logger
function fakeLogger() {
  const lines = { info: [], error: [] };
  return { lines, info: (...a) => lines.info.push(a.join(' ')), error: (...a) => lines.error.push(a.map(String).join(' ')) };
}

// ハンドラごとにサーバを起動し、終わったら止める
async function withServer(handler, fn, opts = {}) {
  const logger = fakeLogger();
  const server = http.createServer(createApp(handler, { logger, ...opts }));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base, logger, server);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
}
// 答えが返ってこないとき（未完成のうち）にテストが止まらないよう、2 秒で諦める
const get = (url, init = {}) => fetch(url, { signal: AbortSignal.timeout(2000), ...init });
const ok = (req, res) => res.end('ok');
const waitFor = async (cond) => {
  for (let i = 0; i < 50 && !cond(); i++) await sleep(10);
};

test('ふつうのハンドラはそのまま動く。X-Request-Id が付く', async () => {
  await withServer(ok, async (base) => {
    const r = await get(base);
    assert.equal(r.status, 200);
    assert.equal(await r.text(), 'ok');
    assert.match(r.headers.get('x-request-id'), /^[0-9a-f-]{36}$/);
  });
});

test('客の X-Request-Id は、形が正しいときだけ使う。req.id でも読める', async () => {
  let seen;
  await withServer((req, res) => { seen = req.id; res.end(); }, async (base) => {
    const r = await get(base, { headers: { 'X-Request-Id': 'abc-123' } });
    assert.equal(r.headers.get('x-request-id'), 'abc-123');
    assert.equal(seen, 'abc-123');
    const bad = await get(base, { headers: { 'X-Request-Id': 'a b<script>' } });
    assert.match(bad.headers.get('x-request-id'), /^[0-9a-f-]{36}$/);
  });
});

test('同期の例外は 500。中身は見せず、ログに残す。サーバは動き続ける', async () => {
  await withServer((req, res) => {
    if (req.url === '/boom') throw new Error('秘密の中身');
    res.end('ok');
  }, async (base, logger) => {
    const r = await get(`${base}/boom`);
    assert.equal(r.status, 500);
    assert.match(r.headers.get('content-type'), /^application\/json; charset=utf-8/);
    const body = await r.json();
    assert.equal(body.error, 'Internal Server Error');
    assert.equal(body.requestId, r.headers.get('x-request-id'));
    assert.doesNotMatch(JSON.stringify(body), /秘密/);
    assert.match(logger.lines.error.join('\n'), /秘密の中身/);
    assert.equal((await get(`${base}/`)).status, 200);
  });
});

test('async のハンドラの失敗（rejected）も 500', async () => {
  await withServer(async () => {
    await sleep(5);
    throw new Error('あとで失敗');
  }, async (base) => {
    assert.equal((await get(base)).status, 500);
  });
});

test('HttpError（400 番台）は、そのステータスとメッセージ。エラーのログには書かない', async () => {
  await withServer(() => {
    throw new HttpError(405, 'このメソッドは使えません', { headers: { Allow: 'GET' } });
  }, async (base, logger) => {
    const r = await get(base, { method: 'DELETE' });
    assert.equal(r.status, 405);
    assert.equal(r.headers.get('allow'), 'GET');
    assert.equal((await r.json()).error, 'このメソッドは使えません');
    assert.equal(logger.lines.error.length, 0);
  });
});

test('HttpError でも 500 番台なら、中身を見せない', async () => {
  await withServer(() => {
    throw new HttpError(503, 'DB のパスワードが違う');
  }, async (base) => {
    const r = await get(base);
    assert.equal(r.status, 500);
    assert.doesNotMatch(await r.text(), /パスワード/);
  });
});

test('途中まで返した後の失敗は、接続を切る（ステータスはもう変えられない）', async () => {
  await withServer(async (req, res) => {
    res.write('途中まで');
    await sleep(5);
    throw new Error('途中で失敗');
  }, async (base) => {
    const r = await get(base);
    assert.equal(r.status, 200);
    await assert.rejects(r.text()); // 本文の途中で切れる
  });
});

test('アクセスログ: メソッド・URL・ステータス・時間・ID を1行で', async () => {
  let t = 1000;
  await withServer((req, res) => { t += 42; res.statusCode = 201; res.end(); }, async (base, logger) => {
    const r = await get(`${base}/items?x=1`, { method: 'POST' });
    await waitFor(() => logger.lines.info.length > 0);
    assert.equal(logger.lines.info[0], `POST /items?x=1 201 42ms ${r.headers.get('x-request-id')}`);
  }, { now: () => t });
});

test('アクセスログ: 返す前に客が切ったら aborted', async () => {
  await withServer(async (req, res) => {
    await sleep(200);
    if (!res.destroyed) res.end('遅い');
  }, async (base, logger) => {
    const { port } = new URL(base);
    const sock = net.connect(port, '127.0.0.1', () => sock.write('GET /slow HTTP/1.1\r\nHost: x\r\n\r\n'));
    await sleep(50);
    sock.destroy();
    await waitFor(() => logger.lines.info.length > 0);
    assert.match(logger.lines.info[0], /^GET \/slow aborted \d+ms /);
  });
});
