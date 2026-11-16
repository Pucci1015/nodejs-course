// 練習問題6 用: tag-report.mjs のテスト（PostgreSQL が動いている必要がある）
// 使い方: node --test tag-report.test.mjs
//   模範解答を試す: MODULE=../solutions/tag-report.mjs node --test tag-report.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTestDb } from './drizzle-test.mjs';

const m = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './tag-report.mjs')).href);

// タグとタスクを増やす（タスクの付いていないタグ「空」と、終わったタスクに付いたタグも作る）
const MORE_SQL = `
  INSERT INTO tasks (title, status) VALUES ('窓を拭く', 'todo'), ('靴を洗う', 'done'), ('資料を送る', 'doing');
  INSERT INTO tags (name) VALUES ('空'), ('仕事');
  INSERT INTO task_tags (task_id, tag_id) VALUES (1, 1), (6, 1), (7, 1), (5, 4), (8, 4), (8, 2);
`;

test('最初のデータで、slowReport と同じ結果', async (t) => {
  const { db, queries } = await createTestDb(t);
  const expected = await m.slowReport(db);
  queries.length = 0;
  assert.deepEqual(await m.fastReport(db), expected);
  assert.deepEqual(expected, [
    { tag: '家', total: 2, open: ['本を返す', '部屋の掃除'] },
    { tag: '急ぎ', total: 1, open: ['報告書を書く'] },
  ]);
});

test('タグを増やしても同じ結果で、SQL は 2 回まで', async (t) => {
  const { db, pool, queries } = await createTestDb(t);
  await pool.query(MORE_SQL);
  queries.length = 0;
  const expected = await m.slowReport(db);
  assert.equal(queries.length, 5, 'slowReport は 1 + タグの数 回');
  queries.length = 0;
  const actual = await m.fastReport(db);
  assert.deepEqual(actual, expected);
  assert.ok(queries.length <= 2, `SQL を ${queries.length} 回送りました`);
  assert.deepEqual(
    actual.find((r) => r.tag === '空'),
    { tag: '空', total: 0, open: [] },
    'タスクの付いていないタグも入れる',
  );
});

test('タグが1つも無ければ []', async (t) => {
  const { db } = await createTestDb(t, { seed: false });
  assert.deepEqual(await m.fastReport(db), []);
});
