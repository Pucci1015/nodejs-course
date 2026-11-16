// 練習問題5 用: task-tags.mjs のテスト（PostgreSQL が動いている必要がある）
// 使い方: node --test task-tags.test.mjs
//   模範解答を試す: MODULE=../solutions/task-tags.mjs node --test task-tags.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTestPool } from './pg-test.mjs';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './task-tags.mjs')).href);

async function setup(t, options) {
  const pool = await createTestPool(t, options);
  await pool.query(m.TAGS_SQL);
  return pool;
}
const tagCount = async (pool) => (await pool.query('SELECT count(*)::int AS n FROM tags')).rows[0].n;

test('setTags: 無いタグは作り、付いたタグの名前を、名前の順に返す', async (t) => {
  const pool = await setup(t);
  assert.deepEqual(await m.setTags(pool, 2, ['家', '急ぎ']), ['家', '急ぎ']);
  assert.deepEqual(await m.setTags(pool, 3, ['家']), ['家']);
  assert.equal(await tagCount(pool), 2, '「家」が2つ作られています');
});

test('setTags: 置き換える（前のタグは外れる）。同じ名前が2回あっても1つ', async (t) => {
  const pool = await setup(t);
  await m.setTags(pool, 2, ['家', '急ぎ']);
  assert.deepEqual(await m.setTags(pool, 2, ['仕事', '仕事']), ['仕事']);
  assert.deepEqual(await m.setTags(pool, 2, []), []);
});

test('setTags: 無いタスクなら例外で、タグも作らない', async (t) => {
  const pool = await setup(t, { max: 2, connectionTimeoutMillis: 1000 });
  await assert.rejects(m.setTags(pool, 99, ['家']), { code: '23503' });
  assert.equal(await tagCount(pool), 0);
  assert.equal(pool.waitingCount, 0);
});

test('tagsOf: そのタスクのタグの名前を、名前の順に。無ければ []', async (t) => {
  const pool = await setup(t);
  await m.setTags(pool, 5, ['急ぎ', '仕事']);
  assert.deepEqual(await m.tagsOf(pool, 5), ['仕事', '急ぎ']);
  assert.deepEqual(await m.tagsOf(pool, 1), []);
});

test('tasksWithTags: 全部のタスクと、そのタグの配列', async (t) => {
  const pool = await setup(t);
  await m.setTags(pool, 2, ['家']);
  await m.setTags(pool, 5, ['急ぎ', '仕事']);
  assert.deepEqual(await m.tasksWithTags(pool), [
    { id: 1, title: '牛乳を買う', tags: [] },
    { id: 2, title: '本を返す', tags: ['家'] },
    { id: 3, title: '部屋の掃除', tags: [] },
    { id: 4, title: "Let's ストレッチ", tags: [] },
    { id: 5, title: '報告書を書く', tags: ['仕事', '急ぎ'] },
  ]);
});
