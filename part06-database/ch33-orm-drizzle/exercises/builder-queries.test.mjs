// 練習問題2 用: builder-queries.mjs のテスト（PostgreSQL が動いている必要がある）
// 使い方: node --test builder-queries.test.mjs
//   模範解答を試す: MODULE=../solutions/builder-queries.mjs node --test builder-queries.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTestDb } from './drizzle-test.mjs';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './builder-queries.mjs');
const m = await import(pathToFileURL(file).href);

test('SQL を文字列で書いていない（sql のタグ付きテンプレートも db.execute も使わない）', async () => {
  const source = await fs.readFile(file, 'utf8');
  assert.doesNotMatch(source, /sql`|\.execute\(|\$client/, 'クエリビルダ（select・where・orderBy …）だけで書いてください');
});

test('findByStatus: title の配列を id の順に', async (t) => {
  const { db } = await createTestDb(t);
  assert.deepEqual(await m.findByStatus(db, 'todo'), ['本を返す', "Let's ストレッチ", '報告書を書く']);
  assert.deepEqual(await m.findByStatus(db, 'doing'), ['部屋の掃除']);
  assert.deepEqual(await m.findByStatus(db, 'nothing'), []);
});

test('searchTitle: 大文字と小文字を区別しない。「\'」が入っていても大丈夫', async (t) => {
  const { db } = await createTestDb(t);
  assert.deepEqual(await m.searchTitle(db, 'let'), [{ id: 4, title: "Let's ストレッチ" }]);
  assert.deepEqual(await m.searchTitle(db, "LET'S"), [{ id: 4, title: "Let's ストレッチ" }]);
  assert.deepEqual(await m.searchTitle(db, 'を'), [
    { id: 1, title: '牛乳を買う' },
    { id: 2, title: '本を返す' },
    { id: 5, title: '報告書を書く' },
  ]);
});

test('countByStatus: 数は number。無い status も 0', async (t) => {
  const { db } = await createTestDb(t);
  assert.deepEqual(await m.countByStatus(db), { todo: 3, doing: 1, done: 1 });
  const { db: empty } = await createTestDb(t, { seed: false });
  assert.deepEqual(await m.countByStatus(empty), { todo: 0, doing: 0, done: 0 });
});

test('overdue: 終わっていなくて期限切れのものを due_date の順に、limit 個まで', async (t) => {
  const { db } = await createTestDb(t);
  assert.deepEqual(await m.overdue(db, { date: '2026-11-13', limit: 10 }), ['報告書を書く', '本を返す']);
  assert.deepEqual(await m.overdue(db, { date: '2026-11-13', limit: 1 }), ['報告書を書く']);
  assert.deepEqual(await m.overdue(db, { date: '2026-11-02', limit: 10 }), [], '終わった「牛乳を買う」は入らない');
});
