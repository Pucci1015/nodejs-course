// 練習問題3 用: mask-url.mjs のテスト
// 使い方: node --test mask-url.test.mjs
//   模範解答を試す: MODULE=../solutions/mask-url.mjs node --test mask-url.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { maskQuery } = await import(pathToFileURL(path.resolve(import.meta.dirname, process.env.MODULE ?? './mask-url.mjs')).href);

test('クエリが無ければ、そのまま', () => {
  assert.equal(maskQuery('/api/tasks'), '/api/tasks');
});

test('token と password の値を *** にする', () => {
  assert.equal(maskQuery('/reset?token=dev-only-abc'), '/reset?token=***');
  assert.equal(maskQuery('/login?user=alice&password=dev-only'), '/login?user=alice&password=***');
});

test('ほかの値と順番は変えない', () => {
  assert.equal(maskQuery('/a?x=1&token=t&y=2'), '/a?x=1&token=***&y=2');
});

test('同じ名前が2つあれば、両方隠す。名前の大文字・小文字は区別しない', () => {
  assert.equal(maskQuery('/a?token=1&TOKEN=2'), '/a?token=***&TOKEN=***');
});

test('隠す名前を渡せる', () => {
  assert.equal(maskQuery('/a?code=123&token=x', ['code']), '/a?code=***&token=x');
});

test('エンコードされた値でも隠す。結果の文字は URL として正しい', () => {
  assert.equal(maskQuery('/a?q=a%20b&password=%E3%81%AD'), '/a?q=a+b&password=***');
});
