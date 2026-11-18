// 第59章 4節: ルールのテスト。ESLint の RuleTester を、node:test の describe・it で動かす
import { describe, it } from 'node:test';
import { RuleTester } from 'eslint';
import rule from './no-focused-tests.ts';

// RuleTester は、テストの道具の describe・it を使って、1つの例を1つのテストにする
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester();

tester.run('no-focused-tests', rule, {
  // 指摘されないはずのコード
  valid: [
    "test('a', () => {});",
    "describe('a', () => {});",
    'only();',
    "list.only('a');",
    "test.skip('a', () => {});",
  ],
  // 指摘されるはずのコードと、指摘の中身
  invalid: [
    { code: "test.only('a', () => {});", errors: [{ messageId: 'focused', data: { name: 'test' } }] },
    { code: "describe.only('a', () => {});", errors: [{ messageId: 'focused', data: { name: 'describe' } }] },
    { code: "it.only('a', () => {});", errors: [{ messageId: 'focused', data: { name: 'it' }, line: 1, column: 4 }] },
  ],
});
