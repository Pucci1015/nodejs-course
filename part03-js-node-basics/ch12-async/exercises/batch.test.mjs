// 練習問題6 用: buggy-batch.mjs のテスト
// 使い方: node --test batch.test.mjs
//   模範解答を試す: MODULE=../solutions/batch.mjs node --test batch.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve(import.meta.dirname, process.env.MODULE ?? './buggy-batch.mjs');
const { importUsers, loadDashboard, saveAll } = await import(pathToFileURL(modulePath).href);

/** 1回の操作に少し時間がかかる、メモリの中のデータベース */
function fakeDb({ failOn } = {}) {
  const users = new Map();
  return {
    users,
    async exists(email) {
      await sleep(5);
      return users.has(email);
    },
    async save(user) {
      await sleep(10);
      if (user.email === failOn) throw new Error(`${user.email} を保存できません`);
      if (users.has(user.email)) throw new Error(`重複して保存されました: ${user.email}`);
      users.set(user.email, user);
    },
    async saveMany(list) {
      await sleep(10);
      if (list.some((u) => u.email === failOn)) throw new Error('ディスクがいっぱいです');
      for (const u of list) users.set(u.email, u);
      return list.length;
    },
  };
}

const rows = [
  { name: ' alice ', email: 'alice@example.com' },
  { name: 'bob', email: 'Bob@Example.com ' },
  { name: 'carol', email: 'carol@example.com' },
];

test('importUsers: 全員を保存し終わってから、件数を返す', async () => {
  const db = fakeDb();
  assert.deepEqual(await importUsers(rows, db), { created: 3, skipped: 0 });
  assert.deepEqual([...db.users.keys()], ['alice@example.com', 'bob@example.com', 'carol@example.com']);
  assert.equal(db.users.get('alice@example.com').name, 'alice');
});

test('importUsers: すでにいるメールアドレスは飛ばす', async () => {
  const db = fakeDb();
  db.users.set('bob@example.com', { name: 'bob（登録済み）', email: 'bob@example.com' });
  assert.deepEqual(await importUsers(rows, db), { created: 2, skipped: 1 });
  assert.equal(db.users.get('bob@example.com').name, 'bob（登録済み）');
});

test('importUsers: rows の中で重複しているメールアドレスも、2回目からは飛ばす', async () => {
  const db = fakeDb();
  const dup = [...rows, { name: 'alice（2回目）', email: 'ALICE@example.com' }];
  assert.deepEqual(await importUsers(dup, db), { created: 3, skipped: 1 });
  assert.equal(db.users.get('alice@example.com').name, 'alice');
});

test('importUsers: 保存に失敗したら rejected になる（unhandled rejection にしない）', async () => {
  const db = fakeDb({ failOn: 'bob@example.com' });
  await assert.rejects(importUsers(rows, db), { message: 'bob@example.com を保存できません' });
  await sleep(50); // 取り残された処理があれば、ここで unhandled rejection になってテストが失敗する
});

test('loadDashboard: 3つを同時に取りに行く', async () => {
  const api = {
    getUser: async (id) => (await sleep(60), { id, name: 'alice' }),
    getPosts: async () => (await sleep(60), ['投稿1', '投稿2']),
    getNotices: async () => (await sleep(60), ['お知らせ']),
  };
  const start = performance.now();
  const result = await loadDashboard(api, 7);
  const elapsed = performance.now() - start;
  assert.deepEqual(result, { user: { id: 7, name: 'alice' }, posts: ['投稿1', '投稿2'], notices: ['お知らせ'] });
  assert.ok(elapsed < 150, `${elapsed.toFixed(0)}ms かかった（同時なら 60ms 程度のはず）`);
});

test('loadDashboard: どれか1つが失敗したら rejected になる', async () => {
  const api = {
    getUser: async () => (await sleep(30), { id: 1 }),
    getPosts: async () => {
      await sleep(10);
      throw new Error('posts の API が 503');
    },
    getNotices: async () => (await sleep(30), []),
  };
  await assert.rejects(loadDashboard(api, 1), { message: 'posts の API が 503' });
});

test('saveAll: 成功したら保存した数を返す', async () => {
  const db = fakeDb();
  assert.equal(await saveAll([{ email: 'a@example.com' }, { email: 'b@example.com' }], db), 2);
});

test('saveAll: 失敗したら「保存に失敗しました」に包み、元のエラーを cause に入れる', async () => {
  const db = fakeDb({ failOn: 'b@example.com' });
  await assert.rejects(saveAll([{ email: 'a@example.com' }, { email: 'b@example.com' }], db), (err) => {
    assert.equal(err.message, '保存に失敗しました');
    assert.equal(err.cause?.message, 'ディスクがいっぱいです');
    return true;
  });
});
