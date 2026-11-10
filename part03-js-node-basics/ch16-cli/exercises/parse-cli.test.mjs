// 練習問題5のテスト
// 使い方: node --test parse-cli.test.mjs
//         MODULE=../solutions/parse-cli.mjs node --test parse-cli.test.mjs   （解答例で確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { parseCli, UsageError } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './parse-cli.mjs')).href);

// UsageError が投げられ、exitCode が 2 で、メッセージが re に合うこと
function usage(argv, re) {
  assert.throws(
    () => parseCli(argv),
    (err) => {
      assert.ok(err instanceof UsageError, `UsageError ではありません: ${err}`);
      assert.equal(err.exitCode, 2);
      assert.match(err.message, re);
      return true;
    },
  );
}

test('add: 残りの引数をつないでタイトルにする。--tag は何回でも', () => {
  assert.deepEqual(parseCli(['add', '牛乳を', '買う', '-t', '買い物', '--tag', '急ぎ', '--due', '2026-11-05']), {
    command: 'add', title: '牛乳を 買う', tags: ['買い物', '急ぎ'], due: '2026-11-05',
  });
  assert.deepEqual(parseCli(['add', '散歩']), { command: 'add', title: '散歩', tags: [], due: null });
});

test('add: -- の後ろは、- で始まっていてもタイトル', () => {
  assert.deepEqual(parseCli(['add', '--', '-5度の朝', '--help']), { command: 'add', title: '-5度の朝 --help', tags: [], due: null });
});

test('add: タイトルが無い・日付が正しくない', () => {
  usage(['add'], /タイトル/);
  usage(['add', '--tag', 'x'], /タイトル/);
  usage(['add', 'a', '--due', '2026/11/05'], /--due/);
  usage(['add', 'a', '--due', '2026-02-30'], /--due/); // 2月30日は無い
  usage(['add', 'a', '--due'], /due/); // 値が無い
});

test('list: 既定の値と、オプション', () => {
  assert.deepEqual(parseCli(['list']), { command: 'list', tag: null, all: false, limit: 20 });
  assert.deepEqual(parseCli(['list', '-a', '-n', '5', '--tag', '仕事']), { command: 'list', tag: '仕事', all: true, limit: 5 });
});

test('list: --limit は1以上の整数だけ', () => {
  for (const bad of ['0', '-1', '1.5', 'abc', '', '1e2', ' 3']) usage(['list', '--limit', bad], /--limit/);
});

test('list: 余分な引数はエラー', () => {
  usage(['list', 'foo'], /余分/);
});

test('done: 番号を1つ', () => {
  assert.deepEqual(parseCli(['done', '3']), { command: 'done', id: 3 });
  usage(['done'], /番号/);
  usage(['done', '1', '2'], /番号/);
  usage(['done', 'x'], /番号/);
});

test('オプションはサブコマンドごと。done に --tag は使えない', () => {
  usage(['done', '3', '--tag', 'x'], /done/);
  usage(['list', '--due', '2026-11-05'], /list/);
});

test('--help はどこにあってもヘルプ。サブコマンドが分かれば topic に入れる', () => {
  assert.deepEqual(parseCli(['--help']), { command: 'help', topic: null });
  assert.deepEqual(parseCli(['-h']), { command: 'help', topic: null });
  assert.deepEqual(parseCli(['add', '--help']), { command: 'help', topic: 'add' });
  assert.deepEqual(parseCli(['list', '-a', '-h']), { command: 'help', topic: 'list' });
  assert.deepEqual(parseCli(['done', 'x', '--nope', '--help']), { command: 'help', topic: 'done' }); // ヘルプが先
  assert.deepEqual(parseCli(['oops', '--help']), { command: 'help', topic: null });
});

test('--version / -V', () => {
  assert.deepEqual(parseCli(['--version']), { command: 'version' });
  assert.deepEqual(parseCli(['-V']), { command: 'version' });
});

test('コマンドが無い・知らないコマンド・知らないオプション', () => {
  usage([], /コマンドを指定/);
  usage(['remove', '1'], /知らないコマンド.*remove/);
  usage(['--nope'], /知らないオプション/);
  usage(['add', 'x', '--nope'], /add/);
});

test('Object.prototype にある名前はコマンドではない', () => {
  usage(['constructor'], /知らないコマンド/);
  usage(['toString'], /知らないコマンド/);
});
