// 練習問題5のテスト（書き換えなくてよい）: node --test prefer-role-query.test.ts
import { describe, it } from 'node:test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RuleTester } from 'eslint';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './rules/prefer-role-query.ts');
const { default: rule }: typeof import('./rules/prefer-role-query.ts') = await import(pathToFileURL(file).href);

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

new RuleTester().run('prefer-role-query', rule, {
  valid: [
    "screen.getByRole('button', { name: '追加' });",
    "getByLabelText('名前');",
    "page.getByRole('link');",
    // 呼び出していない（名前を書いただけ）のは、指摘しない
    'const getByTestId = 1;',
    // 名前が違う
    "screen.getByTestIdOrRole('a');",
  ],
  invalid: [
    {
      code: "screen.getByTestId('save');",
      errors: [{ messageId: 'preferRole', data: { name: 'getByTestId' }, line: 1, column: 8 }],
    },
    { code: "queryByTestId('row');", errors: [{ messageId: 'preferRole', data: { name: 'queryByTestId' } }] },
    { code: "await screen.findAllByTestId('row');", errors: [{ messageId: 'preferRole', data: { name: 'findAllByTestId' } }] },
    { code: "within(list).getAllByTestId('item');", errors: [{ messageId: 'preferRole', data: { name: 'getAllByTestId' } }] },
    // Playwright のロケーターも同じ
    { code: "await page.getByTestId('save').click();", errors: [{ messageId: 'preferRole', data: { name: 'getByTestId' } }] },
    {
      code: "getByTestId('a'); screen.queryAllByTestId('b');",
      errors: [
        { messageId: 'preferRole', data: { name: 'getByTestId' } },
        { messageId: 'preferRole', data: { name: 'queryAllByTestId' } },
      ],
    },
  ],
});
