// 練習問題5のテスト。サーバを別のプロセスで 127.0.0.1:9349 に起動して確かめる（落ちても、テストは続けられる）
// 使い方: node --test chat.test.mjs
//         MODULE=../solutions/chat.mjs node --test chat.test.mjs   （解答例で確かめる）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import WebSocket from 'ws';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './buggy-chat.mjs');
const PORT = 9349;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const HEARTBEAT_MS = 200;
let child;
let output = '';

async function startServer() {
  child = spawn(process.execPath, [file], { env: { ...process.env, PORT: String(PORT), HEARTBEAT_MS: String(HEARTBEAT_MS) }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (d) => (output += d));
  child.stderr.on('data', (d) => (output += d));
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${ORIGIN}/stats`, { signal: AbortSignal.timeout(500) });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error(`サーバが起動しませんでした:\n${output}`);
}
const alive = () => child.exitCode === null && child.signalCode === null;
/** 前のテストでサーバが落ちていたら、起動し直す */
async function ensureServer() {
  if (!alive()) await startServer();
}

before(startServer);
after(() => child.kill());

/** つないで、open か失敗を待つ。届いたメッセージは ws.got にためる */
function connect({ origin = ORIGIN, autoPong = true } = {}) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`, { origin, autoPong });
    ws.got = [];
    ws.closed = new Promise((r) => ws.once('close', (code) => r(code)));
    ws.on('message', (d) => ws.got.push(JSON.parse(d.toString())));
    ws.once('open', () => resolve({ ws, ok: true }));
    ws.once('unexpected-response', (req, res) => resolve({ ws, ok: false, status: res.statusCode }));
    ws.once('error', () => resolve({ ws, ok: false, status: 0 }));
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stats = async () => (await (await fetch(`${ORIGIN}/stats`, { signal: AbortSignal.timeout(1000) })).json()).clients;
async function closeAll(...list) {
  for (const ws of list) ws.terminate();
  await sleep(50);
}

test('1. 送った chat は、全員に届く', async () => {
  await ensureServer();
  const a = (await connect()).ws;
  const b = (await connect()).ws;
  a.send(JSON.stringify({ type: 'chat', text: 'こんにちは' }));
  await sleep(150);
  assert.equal(b.got.at(-1)?.text, 'こんにちは');
  assert.equal(a.got.at(-1)?.type, 'chat');
  await closeAll(a, b);
});

test('2. ほかのオリジンのページからは、つなげない（403）', async () => {
  await ensureServer();
  const r = await connect({ origin: 'https://evil.example' });
  assert.equal(r.ok, false, 'つながってしまった');
  assert.equal(r.status, 403);
  r.ws.terminate();
});

test('3. JSON でないものを送っても、サーバは落ちない。送った人だけに error が返る', async () => {
  await ensureServer();
  const a = (await connect()).ws;
  const b = (await connect()).ws;
  a.send('{これは JSON ではない');
  await sleep(300);
  assert.ok(alive(), `サーバが落ちた:\n${output.split('\n').slice(-8).join('\n')}`);
  assert.equal(a.got.at(-1)?.type, 'error');
  assert.equal(b.got.length, 0);
  await closeAll(a, b);
});

test('4. 形の正しくない chat（text が無い・空・501 文字）は、配らずに error。text の前後の空白は取る', async () => {
  await ensureServer();
  const a = (await connect()).ws;
  const b = (await connect()).ws;
  for (const m of [{ type: 'chat' }, { type: 'chat', text: '   ' }, { type: 'chat', text: 'あ'.repeat(501) }, { type: 'chat', text: 5 }, { text: 'type が無い' }]) a.send(JSON.stringify(m));
  await sleep(300);
  assert.ok(alive(), 'サーバが落ちた');
  assert.equal(b.got.length, 0, `配られてしまった: ${JSON.stringify(b.got)}`);
  assert.equal(a.got.filter((m) => m.type === 'error').length, 5);
  a.send(JSON.stringify({ type: 'chat', text: '  やあ ' }));
  await sleep(150);
  assert.equal(b.got.at(-1)?.text, 'やあ');
  await closeAll(a, b);
});

test('5. 大きすぎるメッセージ（1 MiB）は、受け取らずに接続を閉じる（1009）', async () => {
  await ensureServer();
  const a = (await connect()).ws;
  const b = (await connect()).ws;
  a.send(JSON.stringify({ type: 'chat', text: 'x'.repeat(1024 * 1024) }));
  const code = await Promise.race([a.closed, sleep(1500).then(() => 'open')]);
  assert.equal(code, 1009);
  assert.equal(b.got.length, 0);
  await closeAll(a, b);
});

test('6. 閉じた接続は、数に入らない', async () => {
  await ensureServer();
  const before = await stats();
  const a = (await connect()).ws;
  assert.equal(await stats(), before + 1);
  a.close();
  await a.closed;
  await sleep(100);
  assert.equal(await stats(), before);
});

test('7. ping に返事をしない接続は、心拍で切られる', async () => {
  await ensureServer();
  const dead = (await connect({ autoPong: false })).ws;
  const live = (await connect()).ws;
  const code = await Promise.race([dead.closed, sleep(HEARTBEAT_MS * 5).then(() => 'open')]);
  assert.notEqual(code, 'open', '返事をしない接続が、ずっと残っている');
  assert.equal(live.readyState, WebSocket.OPEN, 'ちゃんと返事をする接続まで切られた');
  await closeAll(live);
});

test('8. 心拍で切った接続も、数に入らない', async () => {
  await ensureServer();
  const before = await stats();
  const dead = (await connect({ autoPong: false })).ws;
  await Promise.race([dead.closed, sleep(HEARTBEAT_MS * 5)]);
  await sleep(100);
  assert.equal(await stats(), before);
  dead.terminate();
});
