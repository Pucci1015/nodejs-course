// 練習問題7のテスト
// 使い方: node --test ws-protocol.test.mjs
//         MODULE=../solutions/ws-protocol.mjs node --test ws-protocol.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { computeAccept, checkHandshake, encodeFrame, decodeFrame } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './ws-protocol.mjs')).href);

const KEY = 'dGhlIHNhbXBsZSBub25jZQ=='; // RFC 6455 1.3 の例
const opts = { allowedOrigins: ['http://localhost:5173'] };
const req = (headers = {}, method = 'GET') => ({
  method,
  headers: {
    upgrade: 'websocket',
    connection: 'Upgrade',
    'sec-websocket-version': '13',
    'sec-websocket-key': KEY,
    origin: 'http://localhost:5173',
    ...headers,
  },
});
const status = (r) => (r.ok ? 101 : r.status);

test('1. Accept は RFC 6455 の例と同じ', () => {
  assert.equal(computeAccept(KEY), 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
  const r = checkHandshake(req(), opts);
  assert.equal(r.ok, true);
  assert.equal(r.headers['Sec-WebSocket-Accept'], 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
});

test('2. Upgrade・Connection は、カンマの並びの中の言葉。大文字・小文字は区別しない', () => {
  assert.equal(status(checkHandshake(req({ connection: 'keep-alive, Upgrade', upgrade: 'WebSocket' }), opts)), 101);
  assert.equal(status(checkHandshake(req({ connection: 'keep-alive' }), opts)), 400);
  assert.equal(status(checkHandshake(req({ upgrade: 'h2c' }), opts)), 400);
  assert.equal(status(checkHandshake(req({}, 'POST'), opts)), 400);
});

test('3. 版が 13 でなければ 426 と Sec-WebSocket-Version: 13', () => {
  const r = checkHandshake(req({ 'sec-websocket-version': '8' }), opts);
  assert.equal(r.status, 426);
  assert.equal(r.headers?.['Sec-WebSocket-Version'], '13');
});

test('4. 鍵は 16 バイトを base64 にしたもの', () => {
  for (const key of [undefined, '', 'abc', 'dGhlIHNhbXBsZSBub25jZQ', 'dGhlIHNhbXBsZSBub25jZQ==x', '!!!!!!!!!!!!!!!!!!!!!!==']) {
    assert.equal(status(checkHandshake(req({ 'sec-websocket-key': key }), opts)), 400, String(key));
  }
});

test('5. Origin が許したものでなければ 403。無いときは allowNoOrigin のときだけ通す', () => {
  assert.equal(status(checkHandshake(req({ origin: 'https://evil.example' }), opts)), 403);
  assert.equal(status(checkHandshake(req({ origin: 'http://localhost:5173.evil.example' }), opts)), 403);
  assert.equal(status(checkHandshake(req({ origin: undefined }), opts)), 403);
  assert.equal(status(checkHandshake(req({ origin: undefined }), { ...opts, allowNoOrigin: true })), 101);
});

test('6. サブプロトコル: 客が出したもののうち、サーバが分かる最初のもの', () => {
  const p = { ...opts, protocols: ['chat.v2', 'chat.v1'] };
  assert.equal(checkHandshake(req({ 'sec-websocket-protocol': 'chat.v1, chat.v2' }), p).headers['Sec-WebSocket-Protocol'], 'chat.v1');
  const none = checkHandshake(req({ 'sec-websocket-protocol': 'mqtt' }), p);
  assert.equal(none.ok, true);
  assert.equal(none.headers['Sec-WebSocket-Protocol'], undefined);
});

test('7. フレーム: 小さな文字のフレーム（サーバから送るものは、マスクしない）', () => {
  assert.deepEqual([...encodeFrame(1, Buffer.from('Hi'))], [0x81, 2, 0x48, 0x69]);
});

test('8. フレーム: 長さが 126〜65535 なら 126 + 2 バイト、それより長ければ 127 + 8 バイト', () => {
  const a = encodeFrame(2, Buffer.alloc(126));
  assert.deepEqual([...a.subarray(0, 4)], [0x82, 126, 0, 126]);
  assert.equal(a.length, 4 + 126);
  const b = encodeFrame(2, Buffer.alloc(70000));
  assert.deepEqual([...b.subarray(0, 10)], [0x82, 127, 0, 0, 0, 0, 0, 1, 0x11, 0x70]);
  assert.equal(b.length, 10 + 70000);
});

test('9. フレーム: マスクして作ったものを読むと元に戻る（長さはいろいろ）', () => {
  const mask = Buffer.from([1, 2, 3, 4]);
  for (const n of [0, 5, 125, 126, 300, 65535, 65536]) {
    const payload = Buffer.alloc(n, 'あ');
    const f = encodeFrame(1, payload, { mask });
    assert.equal(f[1] & 0x80, 0x80, 'マスクの印');
    const d = decodeFrame(f);
    assert.equal(d.size, f.length, `長さ ${n}`);
    assert.ok(d.payload.equals(payload), `長さ ${n}`);
  }
});

test('10. フレーム: まだ全部届いていなければ null。後ろに次のフレームが続いていても、size で区切れる', () => {
  const mask = Buffer.from([9, 9, 9, 9]);
  const f = encodeFrame(1, Buffer.from('こんにちは'), { mask });
  for (const cut of [1, 2, 5, f.length - 1]) assert.equal(decodeFrame(f.subarray(0, cut)), null, `${cut} バイト`);
  const two = Buffer.concat([f, encodeFrame(9, Buffer.alloc(0), { mask })]);
  const first = decodeFrame(two);
  assert.equal(first.payload.toString(), 'こんにちは');
  assert.equal(decodeFrame(two.subarray(first.size)).opcode, 9);
});

test('11. フレーム: maxPayload より大きいと言われたら、全部届く前に RangeError', () => {
  const head = Buffer.from([0x82, 0xff, 0, 0, 0, 1, 0, 0, 0, 0]); // 長さ 2^40、マスクあり
  assert.throws(() => decodeFrame(head, { maxPayload: 1024 }), RangeError);
  const mid = Buffer.from([0x82, 0xfe, 0x10, 0x00]); // 長さ 4096
  assert.throws(() => decodeFrame(mid, { maxPayload: 1024 }), RangeError);
});
