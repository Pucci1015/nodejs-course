// 練習問題8 用: safe-migrate.mjs のテスト（PostgreSQL が動いている必要がある）
// 使い方: node --test safe-migrate.test.mjs
//   模範解答を試す: MODULE=../solutions/safe-migrate.mjs node --test safe-migrate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createTestPool } from './pg-test.mjs';

const { migrate } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './safe-migrate.mjs')).href);

// 一時フォルダに、SQL のファイルを書く
async function makeDir(t, files) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ch32-migrate-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  for (const [name, sql] of Object.entries(files)) await fs.writeFile(path.join(dir, name), sql);
  return dir;
}
const FILES = {
  '001_notes.sql': 'CREATE TABLE notes (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, body text NOT NULL);',
  '002_add_pinned.sql': 'ALTER TABLE notes ADD COLUMN pinned boolean NOT NULL DEFAULT false;',
  'README.md': 'SQL ではないファイルは、動かさない',
};
const names = async (pool) => (await pool.query('SELECT name FROM schema_migrations ORDER BY name')).rows.map((r) => r.name);

test('名前の順に動かし、動かしたファイルの名前を返す。2回目は何もしない', async (t) => {
  const pool = await createTestPool(t, { seed: false });
  const dir = await makeDir(t, FILES);
  assert.deepEqual(await migrate(pool, dir), ['001_notes.sql', '002_add_pinned.sql']);
  assert.deepEqual(await migrate(pool, dir), []);
  assert.deepEqual(await names(pool), ['001_notes.sql', '002_add_pinned.sql']);
  await pool.query('INSERT INTO notes (body) VALUES ($1)', ['x']);
});

test('3つ同時に動かしても、どのファイルも1回だけ動く（エラーにならない）', async (t) => {
  const pool = await createTestPool(t, { seed: false, max: 6 });
  const dir = await makeDir(t, FILES);
  const results = await Promise.all([migrate(pool, dir), migrate(pool, dir), migrate(pool, dir)]);
  assert.deepEqual(results.flat().sort(), ['001_notes.sql', '002_add_pinned.sql']);
  assert.deepEqual(await names(pool), ['001_notes.sql', '002_add_pinned.sql']);
});

test('動かした後で書き換えたファイルがあれば例外。新しいファイルも動かさない', async (t) => {
  const pool = await createTestPool(t, { seed: false });
  const dir = await makeDir(t, FILES);
  await migrate(pool, dir);
  await fs.writeFile(path.join(dir, '001_notes.sql'), FILES['001_notes.sql'].replace('body text', 'body varchar(10)'));
  await fs.writeFile(path.join(dir, '003_more.sql'), 'ALTER TABLE notes ADD COLUMN color text;');
  await assert.rejects(migrate(pool, dir), /001_notes\.sql/);
  assert.deepEqual(await names(pool), ['001_notes.sql', '002_add_pinned.sql']);
});

test('途中のファイルが失敗したら、その前までは残り、失敗したファイルは何も残さない。直せば続きから動く', async (t) => {
  const pool = await createTestPool(t, { seed: false, max: 2, connectionTimeoutMillis: 2000 });
  const dir = await makeDir(t, { ...FILES, '003_bad.sql': 'ALTER TABLE notes ADD COLUMN color text; ALTER TABLE nope ADD COLUMN x int;' });
  await assert.rejects(migrate(pool, dir), /003_bad\.sql/);
  assert.deepEqual(await names(pool), ['001_notes.sql', '002_add_pinned.sql']);
  const cols = (await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'notes' AND table_schema = current_schema()`)).rows.map((r) => r.column_name);
  assert.ok(!cols.includes('color'), '失敗したファイルの前半（color の列）が残っています');
  await fs.writeFile(path.join(dir, '003_bad.sql'), 'ALTER TABLE notes ADD COLUMN color text;');
  assert.deepEqual(await migrate(pool, dir), ['003_bad.sql'], 'ロックか接続が返されていないかもしれません');
  assert.equal(pool.idleCount, pool.totalCount, '接続が返されていません');
});
