// 練習問題7 のテスト
// 使い方: node --test migration-check.test.ts
//   模範解答を試す: MODULE=../solutions/migration-check.ts node --test migration-check.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './migration-check.ts');
const { checkMigration }: typeof import('./migration-check.ts') = await import(pathToFileURL(file).href);

const M = {
  drop: 'DROP COLUMN: 古い版がまだ使っています（後のデプロイで消します）',
  rename: 'RENAME: 古い版は古い名前を使っています（足す → 移す → 消す に分けます）',
  notNull: 'NOT NULL の列を DEFAULT なしで足すと、古い版の INSERT が失敗します',
  type: '列の型を変えると、表を書き直す間、読み書きが止まります',
  index: 'CREATE INDEX は、作り終わるまで書き込みを止めます（CONCURRENTLY を付けます）',
  table: 'DROP TABLE: 古い版がまだ使っています（後のデプロイで消します）',
};

test('足すだけの安全なマイグレーションは、空の配列', () => {
  const sql = `
    -- 列を足す（NULL を許す）
    ALTER TABLE tasks ADD COLUMN priority integer;
    ALTER TABLE tasks ADD COLUMN note text NOT NULL DEFAULT '';
    CREATE INDEX CONCURRENTLY tasks_priority ON tasks (priority);
    CREATE TABLE attachments (id bigserial PRIMARY KEY);
  `;
  assert.deepEqual(checkMigration(sql), []);
});

test('DROP COLUMN と DROP TABLE', () => {
  assert.deepEqual(checkMigration('ALTER TABLE tasks DROP COLUMN note; DROP TABLE old_tasks;'), [
    `1 文目: ${M.drop}`,
    `2 文目: ${M.table}`,
  ]);
});

test('RENAME（列も表も）', () => {
  assert.deepEqual(
    checkMigration('ALTER TABLE tasks RENAME COLUMN title TO name;\nALTER TABLE tasks RENAME TO todos;'),
    [`1 文目: ${M.rename}`, `2 文目: ${M.rename}`],
  );
});

test('NOT NULL の列を DEFAULT なしで足す', () => {
  assert.deepEqual(checkMigration('ALTER TABLE tasks ADD COLUMN owner_id bigint NOT NULL;'), [`1 文目: ${M.notNull}`]);
});

test('列の型を変える（ALTER COLUMN … TYPE と SET DATA TYPE）', () => {
  assert.deepEqual(
    checkMigration('ALTER TABLE tasks ALTER COLUMN title TYPE varchar(200); ALTER TABLE tasks ALTER COLUMN id SET DATA TYPE bigint'),
    [`1 文目: ${M.type}`, `2 文目: ${M.type}`],
  );
});

test('CONCURRENTLY の無い CREATE INDEX（UNIQUE も）', () => {
  assert.deepEqual(
    checkMigration('CREATE INDEX tasks_due ON tasks (due_date);\nCREATE UNIQUE INDEX tasks_title ON tasks (title);'),
    [`1 文目: ${M.index}`, `2 文目: ${M.index}`],
  );
});

test('小文字・改行・余分な空白でも見つける。注釈の中の言葉は見ない', () => {
  const sql = `
    -- drop column は次のデプロイで
    alter table tasks
      drop   column note;
    ;
    create index tasks_x on tasks(x) -- concurrently を忘れた
  `;
  assert.deepEqual(checkMigration(sql), [`1 文目: ${M.drop}`, `2 文目: ${M.index}`]);
});

test('1つの文に2つあれば、両方（表の順）', () => {
  assert.deepEqual(checkMigration('ALTER TABLE tasks DROP COLUMN a, ADD COLUMN b int NOT NULL;'), [
    `1 文目: ${M.drop}`,
    `1 文目: ${M.notNull}`,
  ]);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
