// 練習問題6のテスト
// 使い方: node --test event-hub.test.mjs
//         MODULE=../solutions/event-hub.mjs node --test event-hub.test.mjs   （解答例で確かめる）
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';

const { createEventHub, sseRoute } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './event-hub.mjs')).href);

const collect = () => {
  const got = [];
  const fn = (e) => got.push(`${e.type}:${e.id}`);
  fn.got = got;
  return fn;
};

test('1. 配ると、受け取っている全員に届く。id は 1, 2, 3, …（文字列）', () => {
  const hub = createEventHub();
  const a = collect();
  const b = collect();
  hub.subscribe(undefined, a);
  hub.subscribe(undefined, b);
  assert.equal(hub.publish('task', { id: 1 }), '1');
  assert.equal(hub.publish('task', 'x'), '2');
  assert.deepEqual(a.got, ['task:1', 'task:2']);
  assert.deepEqual(b.got, a.got);
});

test('2. やめる関数で外れる。外れた後は届かない', () => {
  const hub = createEventHub();
  const a = collect();
  const off = hub.subscribe(undefined, a);
  assert.equal(hub.size(), 1);
  off();
  assert.equal(hub.size(), 0);
  hub.publish('task', 'x');
  assert.deepEqual(a.got, []);
});

test('3. lastEventId の後のものを、先に送り直す', () => {
  const hub = createEventHub();
  for (let i = 0; i < 5; i++) hub.publish('task', i);
  const a = collect();
  hub.subscribe('3', a);
  hub.publish('task', 5);
  assert.deepEqual(a.got, ['task:4', 'task:5', 'task:6']);
});

test('4. 覚えるのは bufferSize 個まで。古すぎる id・知らない id には reset を1つ', () => {
  const hub = createEventHub({ bufferSize: 3 });
  for (let i = 0; i < 10; i++) hub.publish('task', i); // 覚えているのは 8, 9, 10
  assert.equal(hub.buffered(), 3);
  const ok = collect();
  hub.subscribe('7', ok); // 8 から送り直せる
  assert.deepEqual(ok.got, ['task:8', 'task:9', 'task:10']);
  for (const id of ['6', '99', 'abc', '-1']) {
    const r = collect();
    hub.subscribe(id, r);
    assert.deepEqual(r.got, ['reset:10'], `lastEventId ${id}`);
  }
});

test('5. lastEventId が今の id と同じなら、何も送り直さない', () => {
  const hub = createEventHub();
  hub.publish('task', 1);
  const a = collect();
  hub.subscribe('1', a);
  assert.deepEqual(a.got, []);
});

// ---- ここから HTTP

const hub = createEventHub({ bufferSize: 10 });
const app = express();
app.get('/events', sseRoute(hub, { heartbeatMs: 100, retryMs: 2500 }));
const server = await new Promise((r) => {
  const s = app.listen(0, '127.0.0.1', () => r(s));
});
const base = `http://127.0.0.1:${server.address().port}`;
after(() => {
  server.closeAllConnections();
  server.close();
});

/** ms ミリ秒だけ読んで、届いた文字列を返す（ヘッダが来なくても、時間が来たらやめる） */
async function read(url, { headers = {}, ms = 300, during } = {}) {
  const ac = new AbortController();
  const stop = setTimeout(() => ac.abort(), 50 + ms + 500);
  let res;
  let text = '';
  try {
    res = await fetch(base + url, { headers, signal: ac.signal });
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    const done = (async () => {
      try {
        for (;;) {
          const { value, done: end } = await reader.read();
          if (end) break;
          text += value;
        }
      } catch {}
    })();
    await new Promise((r) => setTimeout(r, 50));
    during?.();
    await new Promise((r) => setTimeout(r, ms));
    ac.abort();
    await done;
  } catch {
    // ヘッダが届かなかった
  } finally {
    clearTimeout(stop);
  }
  return { res: res ?? { headers: new Headers() }, text };
}

test('6. text/event-stream で、最初に retry を送る', async () => {
  const { res, text } = await read('/events', { ms: 50 });
  assert.match(res.headers.get('content-type') ?? '', /^text\/event-stream/);
  assert.equal(res.headers.get('cache-control'), 'no-cache');
  assert.ok(text.startsWith('retry: 2500\n\n'), JSON.stringify(text));
});

test('7. 配ったものが、id と event つきで届く', async () => {
  const { text } = await read('/events', { during: () => hub.publish('task', { id: 1 }), ms: 50 });
  assert.ok(text.includes('event: task\ndata: {"id":1}\nid: 1\n\n'), JSON.stringify(text));
});

test('8. Last-Event-ID ヘッダ（または ?lastEventId=）の後のものを送り直す', async () => {
  hub.publish('task', 'b'); // id 2
  hub.publish('task', 'c'); // id 3
  const h = await read('/events', { headers: { 'Last-Event-ID': '1' }, ms: 50 });
  assert.ok(h.text.includes('id: 2\n') && h.text.includes('id: 3\n') && !h.text.includes('id: 1\n'), JSON.stringify(h.text));
  const q = await read('/events?lastEventId=2', { ms: 50 });
  assert.ok(q.text.includes('id: 3\n') && !q.text.includes('id: 2\n'), JSON.stringify(q.text));
});

test('9. 心拍のコメントが、決めた間隔で届く', async () => {
  const { text } = await read('/events', { ms: 350 });
  assert.ok((text.match(/^: ping\n\n/gm) ?? []).length >= 2, JSON.stringify(text));
});

test('10. 客が切ったら、ハブから外れる', async () => {
  await read('/events', { ms: 50 });
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(hub.size(), 0);
});
