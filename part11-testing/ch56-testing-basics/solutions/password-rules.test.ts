// 練習問題3 の模範解答: 境界の内側と外側を表に並べる
// 確かめ方（exercises/ で）: node ../../tools/check-tests.ts ../solutions/password-rules.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? '../exercises/password-rules.ts');
const { checkPassword }: typeof import('../exercises/password-rules.ts') = await import(pathToFileURL(file).href);

type Problem = ReturnType<typeof checkPassword>[number];

const EMAIL = 'alice@example.com';

// [説明, パスワード, 期待する問題の配列]
const cases: [string, string, Problem[]][] = [
  ['ふつうのパスワード', 'correct horse battery', []],
  // 追加: 長さの境界（11・12 と 64・65）
  ['11 文字は短すぎる', 'a'.repeat(11), ['too_short']],
  ['12 文字は通る', 'b'.repeat(12), []],
  ['64 文字は通る', 'c'.repeat(64), []],
  ['65 文字は長すぎる', 'd'.repeat(65), ['too_long']],
  // 追加: 絵文字は1文字（length では2）。6文字 + 絵文字6個 = 12 文字
  ['絵文字も1文字と数える（12 文字）', `abcdef${'🍣'.repeat(6)}`, []],
  ['絵文字も1文字と数える（11 文字）', `abcde${'🍣'.repeat(6)}`, ['too_short']],
  // 追加: メールアドレスの @ より前
  ['@ より前を含む', 'my name is alice!!', ['contains_email']],
  ['大文字でも含むとみなす', 'my name is ALICE!!', ['contains_email']],
  // 追加: よく使われるもの
  ['よく使われるもの', 'password1234', ['common']],
  ['大文字にしても、よく使われるもの', 'PASSWORD1234', ['common']],
];

for (const [name, password, expected] of cases) {
  test(name, () => {
    assert.deepEqual(checkPassword(password, EMAIL), expected);
  });
}

// 追加: @ より前がちょうど 3 文字の境界は、別のアドレスで確かめる
test('@ より前が 3 文字なら探す・2 文字なら探さない', () => {
  assert.deepEqual(checkPassword('i am bob, hello', 'bob@example.com'), ['contains_email']);
  assert.deepEqual(checkPassword('i am bo, hello!', 'bo@example.com'), []);
});
