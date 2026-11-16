// 練習問題7 用: todo-db.mjs のテスト。一時フォルダの DB ファイルを使い、CLI として動かす
// 使い方: node --test todo-db.test.mjs
//   模範解答を試す: MODULE=../solutions/todo-db.mjs node --test todo-db.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const script = path.resolve(import.meta.dirname, process.env.MODULE ?? './todo-db.mjs');

function makeRunner() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-db-'));
  const env = { ...process.env, TODO_DB: path.join(dir, 'todo.db') };
  return (...args) => {
    const r = spawnSync(process.execPath, [script, ...args], { env, encoding: 'utf8', timeout: 5000 });
    return { code: r.status, out: r.stdout, err: r.stderr };
  };
}

test('add: 「追加しました: 番号 題名」と出し、終了コード 0', () => {
  const run = makeRunner();
  assert.deepEqual(run('add', '牛乳を買う'), { code: 0, out: '追加しました: 1 牛乳を買う\n', err: '' });
  assert.equal(run('add', '本を返す').out, '追加しました: 2 本を返す\n');
});

test('list: 何も無ければ「タスクはありません」', () => {
  const run = makeRunner();
  assert.deepEqual(run('list'), { code: 0, out: 'タスクはありません\n', err: '' });
});

test('list: 番号の順に、終わったものは [x]、まだのものは [ ]', () => {
  const run = makeRunner();
  run('add', '牛乳を買う');
  run('add', '本を返す');
  run('done', '1');
  assert.equal(run('list').out, '[x] 1 牛乳を買う\n[ ] 2 本を返す\n');
});

test('ファイルに保存されるので、別のプロセスで動かしても残っている', () => {
  const run = makeRunner();
  run('add', 'a');
  run('add', 'b');
  run('rm', '1');
  assert.equal(run('list').out, '[ ] 2 b\n');
});

test('done・rm: 「完了にしました: 番号」「消しました: 番号」。無い番号は標準エラー出力に出して終了コード 1', () => {
  const run = makeRunner();
  run('add', 'a');
  assert.deepEqual(run('done', '1'), { code: 0, out: '完了にしました: 1\n', err: '' });
  assert.deepEqual(run('rm', '1'), { code: 0, out: '消しました: 1\n', err: '' });
  assert.deepEqual(run('done', '9'), { code: 1, out: '', err: 'タスク 9 はありません\n' });
  assert.deepEqual(run('rm', '9'), { code: 1, out: '', err: 'タスク 9 はありません\n' });
});

test("題名に ' や空白が入っていても、そのまま保存する", () => {
  const run = makeRunner();
  run('add', "bob's  plan");
  assert.equal(run('list').out, "[ ] 1 bob's  plan\n");
});

test('使い方の間違い（コマンドが無い・知らない・引数が無い）は、標準エラー出力に使い方を出して終了コード 2', () => {
  const run = makeRunner();
  for (const args of [[], ['hello'], ['add'], ['done']]) {
    const r = run(...args);
    assert.equal(r.code, 2, args.join(' '));
    assert.match(r.err, /使い方/);
    assert.equal(r.out, '');
  }
});
