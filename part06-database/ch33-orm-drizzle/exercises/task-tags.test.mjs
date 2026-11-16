// 練習問題5 用: task-tags.mjs のテスト（PostgreSQL が動いている必要がある）
// 使い方: node --test task-tags.test.mjs
//   模範解答を試す: MODULE=../solutions/task-tags.mjs node --test task-tags.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { count } from 'drizzle-orm';
import { createTestDb } from './drizzle-test.mjs';
import { tags } from './schema.mjs';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './task-tags.mjs')).href);
const tagCount = async (db) => (await db.select({ n: count() }).from(tags))[0].n;

test('setTags: 無いタグは作り、付いたタグの名前を、名前の順に返す', async (t) => {
  const { db } = await createTestDb(t);
  assert.deepEqual(await m.setTags(db, 4, ['急ぎ', '体']), ['体', '急ぎ']);
  assert.deepEqual(await m.setTags(db, 1, ['体']), ['体']);
  assert.equal(await tagCount(db), 3, '「体」が2つ作られています');
});

test('setTags: 置き換える（前のタグは外れる）。同じ名前が2回あっても1つ', async (t) => {
  const { db } = await createTestDb(t);
  assert.deepEqual(await m.setTags(db, 2, ['仕事', '仕事']), ['仕事']);
  assert.deepEqual(await m.tagsOf(db, 2), ['仕事']);
  assert.deepEqual(await m.setTags(db, 2, []), []);
  assert.deepEqual(await m.tagsOf(db, 2), []);
});

test('setTags: 無いタスクなら例外で、タグも作らない（トランザクション）', async (t) => {
  const { db } = await createTestDb(t);
  await assert.rejects(m.setTags(db, 99, ['新しいタグ']), (err) => (err.cause ?? err).code === '23503');
  assert.equal(await tagCount(db), 2);
});

test('tagsOf: そのタスクのタグの名前を、名前の順に。無ければ []', async (t) => {
  const { db } = await createTestDb(t);
  assert.deepEqual(await m.tagsOf(db, 3), ['家']);
  await m.setTags(db, 5, ['急ぎ', '仕事']);
  assert.deepEqual(await m.tagsOf(db, 5), ['仕事', '急ぎ']);
  assert.deepEqual(await m.tagsOf(db, 1), []);
});

test('tasksWithTags: 全部のタスクと、そのタグの配列。SQL は 2 回まで', async (t) => {
  const { db, queries } = await createTestDb(t);
  await m.setTags(db, 5, ['急ぎ', '仕事']);
  queries.length = 0;
  assert.deepEqual(await m.tasksWithTags(db), [
    { id: 1, title: '牛乳を買う', tags: [] },
    { id: 2, title: '本を返す', tags: ['家'] },
    { id: 3, title: '部屋の掃除', tags: ['家'] },
    { id: 4, title: "Let's ストレッチ", tags: [] },
    { id: 5, title: '報告書を書く', tags: ['仕事', '急ぎ'] },
  ]);
  assert.ok(queries.length <= 2, `SQL を ${queries.length} 回送りました（タスクごとに読むと N+1 になります）`);
});
