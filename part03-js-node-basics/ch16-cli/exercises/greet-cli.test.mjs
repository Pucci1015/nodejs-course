// 練習問題1 用: greet-cli.mjs のテスト（CLI を子プロセスとして動かして確かめる）
// 使い方: node --test greet-cli.test.mjs
//   模範解答を試す: MODULE=../solutions/greet-cli.mjs node --test greet-cli.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const CLI = path.resolve(import.meta.dirname, process.env.MODULE ?? './greet-cli.mjs');
const run = (...args) => {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: { PATH: process.env.PATH, NO_COLOR: '1' } });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
};

test('名前が無ければ world にあいさつする', () => {
  assert.deepEqual(run(), { code: 0, stdout: 'こんにちは、world\n', stderr: '' });
});

test('名前を並べると、1人ずつあいさつする', () => {
  assert.deepEqual(run('alice', 'bob'), { code: 0, stdout: 'こんにちは、alice\nこんにちは、bob\n', stderr: '' });
});

test('--shout（-s）で、大文字にして最後に ！ を付ける', () => {
  assert.equal(run('alice', '--shout').stdout, 'こんにちは、ALICE！\n');
  assert.equal(run('-s', 'bob').stdout, 'こんにちは、BOB！\n');
});

test('--times（-t）で、その回数だけ繰り返す', () => {
  assert.equal(run('alice', '--times', '2').stdout, 'こんにちは、alice\nこんにちは、alice\n');
  assert.equal(run('-t', '3').stdout, 'こんにちは、world\n'.repeat(3));
});

test('--times が 1 以上の整数でなければ、標準エラー出力に書いて、終了コード 2', () => {
  for (const bad of ['0', '-1', 'abc', '1.5', '']) {
    const r = run('--times', bad);
    assert.equal(r.code, 2, `--times ${JSON.stringify(bad)} の終了コード`);
    assert.equal(r.stdout, '', '標準出力には何も出さない');
    assert.match(r.stderr, /--times/);
  }
});

test('--help（-h）で、使い方を標準出力に出して、終了コード 0', () => {
  for (const flag of ['--help', '-h']) {
    const r = run('alice', flag);
    assert.equal(r.code, 0);
    assert.match(r.stdout, /^使い方: /);
    assert.equal(r.stderr, '');
  }
});

test('知らないオプションなら、標準エラー出力に使い方を書いて、終了コード 2', () => {
  const r = run('--loud');
  assert.equal(r.code, 2);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /使い方: /);
});
