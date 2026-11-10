// 練習問題6のテスト。Fastify の inject で、サーバを起動せずにリクエストを送る
// 使い方: node --test fastify-users.test.mjs
//         MODULE=../solutions/fastify-users.mjs node --test fastify-users.test.mjs   （解答例で確かめる）
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { createApp } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './fastify-users.mjs')).href);

let app;
let users;
beforeEach(async () => {
  users = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `user${i + 1}`, email: `user${i + 1}@example.test`, passwordHash: `dev-only-hash-${i + 1}`, role: 'member' }));
  app = createApp({ users });
  await app.ready();
});
const inject = async (opts) => {
  const r = await app.inject(opts);
  return { status: r.statusCode, json: r.json(), body: r.body };
};

test('1. 1人を見る: id と name だけを返す（passwordHash・email・role は出さない）', async () => {
  const r = await inject({ url: '/users/3' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { id: 3, name: 'user3' });
});

test('2. 一覧でも、出すのは id と name だけ', async () => {
  const r = await inject({ url: '/users?limit=2' });
  assert.deepEqual(r.json, { items: [{ id: 1, name: 'user1' }, { id: 2, name: 'user2' }] });
  assert.ok(!r.body.includes('hash'), r.body);
});

test('3. limit は 1〜100 の、数字だけの文字列（\' 20\'・2e1・0 などは 400）', async () => {
  assert.equal((await inject({ url: '/users?limit=100' })).status, 200);
  for (const q of ['limit=0', 'limit=101', 'limit=2e1', 'limit=%2020', 'limit=abc', 'limit=', 'limit=1&limit=2']) {
    const r = await inject({ url: `/users?${q}` });
    assert.equal(r.status, 400, q);
  }
});

test('4. 知らないクエリの名前は、黙って無視せずに 400', async () => {
  assert.equal((await inject({ url: '/users?page=2' })).status, 400);
});

test('5. 形の違う id は 404', async () => {
  for (const id of ['abc', '0', '1.5']) assert.equal((await inject({ url: `/users/${id}` })).status, 404, id);
});

test('6. 作る: 201 で、返すのは id と name だけ', async () => {
  const r = await inject({ method: 'POST', url: '/users', payload: { name: 'alice', email: 'alice@example.test' } });
  assert.equal(r.status, 201);
  assert.deepEqual(r.json, { id: 31, name: 'alice' });
});

test('7. 作る: 知らない項目（role など）は 422 で、作らない', async () => {
  const r = await inject({ method: 'POST', url: '/users', payload: { name: 'x', email: 'x@example.test', role: 'admin' } });
  assert.equal(r.status, 422);
  assert.equal(users.length, 30);
});

test('8. 作る: name が無い・空・51 文字、email の形が違うものは 422', async () => {
  for (const payload of [{ email: 'a@example.test' }, { name: '', email: 'a@example.test' }, { name: 'あ'.repeat(51), email: 'a@example.test' }, { name: 'a', email: 'not-an-email' }]) {
    const r = await inject({ method: 'POST', url: '/users', payload });
    assert.equal(r.status, 422, JSON.stringify(payload));
  }
  assert.equal(users.length, 30);
});
