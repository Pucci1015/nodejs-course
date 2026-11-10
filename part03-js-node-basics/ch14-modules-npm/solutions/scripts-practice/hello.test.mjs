// 練習問題3 用: hello.mjs のテスト（完成しています）。npm test で実行されるようにする
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const hello = (...args) => execFileSync(process.execPath, [`${import.meta.dirname}/hello.mjs`, ...args], { encoding: 'utf8' });

test('名前が無ければ world', () => {
  assert.equal(hello(), 'こんにちは、world\n');
});

test('名前があれば、その名前', () => {
  assert.equal(hello('bob'), 'こんにちは、bob\n');
});
