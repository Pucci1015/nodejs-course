// 練習問題8 のテスト
// 使い方: node --test report.test.ts
//   模範解答を試す: MODULE=../solutions/report.ts node --test report.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFileOf, typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './report.ts');
const m = await import(pathToFileURL(file).href);

test('parseLine: 正しい行', () => {
  assert.deepEqual(m.parseLine('1,牛乳を買う,todo,2026-11-10'), { id: 1, title: '牛乳を買う', status: 'todo', dueDate: '2026-11-10' });
  assert.deepEqual(m.parseLine('3,掃除,done'), { id: 3, title: '掃除', status: 'done' });
  assert.deepEqual(m.parseLine('4,手紙を出す,todo,'), { id: 4, title: '手紙を出す', status: 'todo' }, '締め切りが空なら項目を作らない');
  assert.deepEqual(m.parseLine('6,  電話をかける , DOING ,2026-11-11'), { id: 6, title: '電話をかける', status: 'doing', dueDate: '2026-11-11' }, '前後の空白を除き、状態は小文字にする');
});

test('parseLine: 読めない行は null', () => {
  for (const line of ['', '   ', '# コメント', '5,旅行の計画,waiting', 'x,名前,todo', '0,ゼロ,todo', '1.5,小数,todo', '7,,todo', '8,題名だけ']) {
    assert.equal(m.parseLine(line), null, JSON.stringify(line));
  }
});

test('formatReport: 1行目に数、続けて1行に1つずつ', () => {
  const tasks = [
    { id: 1, title: '牛乳を買う', status: 'todo', dueDate: '2026-11-10' },
    { id: 2, title: '本を返す', status: 'doing', dueDate: '2026-11-20' },
    { id: 3, title: '掃除', status: 'done', dueDate: '2026-11-01' },
    { id: 4, title: '手紙を出す', status: 'todo' },
  ];
  assert.equal(
    m.formatReport(tasks, '2026-11-11'),
    [
      '未着手 2 / 作業中 1 / 完了 1',
      '#1 [未着手] 牛乳を買う（締め切り 2026-11-10・過ぎています）',
      '#2 [作業中] 本を返す（締め切り 2026-11-20）',
      '#3 [完了] 掃除（締め切り 2026-11-01）',
      '#4 [未着手] 手紙を出す',
    ].join('\n'),
  );
  assert.equal(m.formatReport([], '2026-11-11'), '未着手 0 / 作業中 0 / 完了 0');
});

function run(...args: string[]) {
  return spawnSync(process.execPath, [file, ...args], { cwd: import.meta.dirname, encoding: 'utf8' });
}

test('CLI: ファイルを読んで報告を出し、読めない行は標準エラー出力に', () => {
  const r = run('tasks.txt', '2026-11-11');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(
    r.stdout,
    [
      '未着手 2 / 作業中 2 / 完了 1',
      '#1 [未着手] 牛乳を買う（締め切り 2026-11-10・過ぎています）',
      '#2 [作業中] 本を返す（締め切り 2026-11-20）',
      '#3 [完了] 掃除',
      '#4 [未着手] 手紙を出す',
      '#6 [作業中] 電話をかける（締め切り 2026-11-11）',
      '',
    ].join('\n'),
  );
  assert.equal(r.stderr, '読めない行: 7行目\n読めない行: 8行目\n');
});

test('CLI: 引数が足りなければ、使い方を出して終了コード 1', () => {
  const r = run('tasks.txt');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /使い方: node report\.ts ファイル 今日の日付/);
  assert.equal(r.stdout, '');
});

test('型: tsc のエラーが無い（report.check.ts の確かめを含む）', () => {
  assert.deepEqual(typeErrors([file, checkFileOf(file)]), []);
});
