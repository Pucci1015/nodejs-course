// 練習問題3: checkPassword のテストを、表で回す形で書く
// 使い方: node --test password-rules.test.ts
//         node ../../tools/check-tests.ts password-rules.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './password-rules.ts');
const { checkPassword }: typeof import('./password-rules.ts') = await import(pathToFileURL(file).href);

type Problem = ReturnType<typeof checkPassword>[number];

const EMAIL = 'alice@example.com';

// [説明, パスワード, 期待する問題の配列]
const cases: [string, string, Problem[]][] = [
  ['ふつうのパスワード', 'correct horse battery', []],
  // ここを書く（境界の内側と外側を、1行ずつ足す）
];

for (const [name, password, expected] of cases) {
  test(name, () => {
    assert.deepEqual(checkPassword(password, EMAIL), expected);
  });
}
