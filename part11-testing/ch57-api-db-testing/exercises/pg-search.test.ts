// 練習問題6 のテスト（PostgreSQL 5433 が要る）
// 使い方: node --test pg-search.test.ts
//   模範解答を試す: MODULE=../solutions/pg-search.ts node --test pg-search.test.ts
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createPgRepo } from './pg-repo.ts';
import { createTestDb, type TestDb } from './test-db.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './pg-search.ts');
const { searchTasks }: typeof import('./pg-search.ts') = await import(pathToFileURL(file).href);

let db: TestDb;
before(async () => {
  db = await createTestDb();
});
after(() => db?.drop());

// どのテストも、同じ6つのタスクから探す
beforeEach(async () => {
  await db.pool.query('TRUNCATE tasks RESTART IDENTITY');
  const repo = createPgRepo(db.pool);
  for (const title of ['Buy milk', '牛乳を買う', "Let's ストレッチ", '100% 果汁', 'file_name を直す', 'C:\\temp を片付ける']) {
    await repo.insert({ title, dueDate: null });
  }
});

const titles = async (text: string) => (await searchTasks(db.pool, text)).map((task) => task.title);

test('題名の一部で探し、id の順に、タスクの形で返す', async () => {
  const found = await searchTasks(db.pool, 'milk');
  assert.deepEqual(found, [{ id: 1, title: 'Buy milk', status: 'todo', dueDate: null }]);
  assert.deepEqual(await titles('を'), ['牛乳を買う', 'file_name を直す', 'C:\\temp を片付ける']);
});

test('大文字・小文字を区別しない', async () => {
  assert.deepEqual(await titles('MILK'), ['Buy milk']);
});

test("' を含む言葉でも探せる", async () => {
  assert.deepEqual(await titles("Let's"), ["Let's ストレッチ"]);
});

test('% と _ は、ふつうの文字として探す', async () => {
  // LIKE では、% は「何文字でも」、_ は「どれか1文字」の意味なので、そのままだと全部に合ってしまう
  assert.deepEqual(await titles('%'), ['100% 果汁']);
  assert.deepEqual(await titles('_'), ['file_name を直す']);
});

test('\\ も、ふつうの文字として探す', async () => {
  assert.deepEqual(await titles('\\'), ['C:\\temp を片付ける']);
  assert.deepEqual(await titles('\\%'), []);
});

test('前後の空白は除く。空なら探さずに空の配列', async () => {
  assert.deepEqual(await titles('  milk '), ['Buy milk']);
  assert.deepEqual(await titles('   '), []);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
