// 練習問題3 用: fastify-basic.mjs のテスト。ポートを開かずに app.inject で確かめる
// 使い方: node --test fastify-basic.test.mjs
//   模範解答を試す: MODULE=../solutions/fastify-basic.mjs node --test fastify-basic.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { buildApp } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './fastify-basic.mjs')).href);

const app = buildApp();
const post = (payload) => app.inject({ method: 'POST', url: '/notes', payload });

test('GET /ping: { pong: true }', async () => {
  const res = await app.inject({ method: 'GET', url: '/ping' });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { pong: true });
});

test('POST /notes: 201 と、作ったメモ', async () => {
  const res = await post({ text: '牛乳を買う', pinned: true });
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.json(), { id: 1, text: '牛乳を買う', pinned: true });
});

test('POST /notes: pinned が無ければ false になる', async () => {
  const res = await post({ text: 'a' });
  assert.equal(res.statusCode, 201);
  assert.equal(res.json().pinned, false);
});

test('POST /notes: 応答には、スキーマに書いた項目（id・text・pinned）だけが出る', async () => {
  const res = await post({ text: 'a' });
  assert.deepEqual(Object.keys(res.json()).sort(), ['id', 'pinned', 'text']);
});

test('POST /notes: text が無い・空・141 文字以上のときは 400', async () => {
  for (const body of [{}, { text: '' }, { text: 'あ'.repeat(141) }]) {
    assert.equal((await post(body)).statusCode, 400, JSON.stringify(body));
  }
  assert.equal((await post({ text: 'あ'.repeat(140) })).statusCode, 201);
});

test('POST /notes: 知らない項目があれば、黙って消さずに 400', async () => {
  assert.equal((await post({ text: 'a', owner: 'bob' })).statusCode, 400);
});
