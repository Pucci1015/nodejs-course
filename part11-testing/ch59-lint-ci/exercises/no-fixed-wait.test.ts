// 練習問題8のテスト（書き換えなくてよい）: node --test no-fixed-wait.test.ts
import { describe, it } from 'node:test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RuleTester } from 'eslint';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './rules/no-fixed-wait.ts');
const { default: rule }: typeof import('./rules/no-fixed-wait.ts') = await import(pathToFileURL(file).href);

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

new RuleTester().run('no-fixed-wait', rule, {
  valid: [
    "await screen.findByText('牛乳を買う');",
    // Promise の外の setTimeout（タイマーそのもののテストなど）は指摘しない
    'setTimeout(done, 100);',
    'new Promise((resolve) => resolve(1));',
    // Promise の中でも、さらに別の関数の中の setTimeout は指摘しない（すぐ呼ばれるとは限らない）
    'new Promise((resolve) => { emitter.on("ready", () => { setTimeout(resolve, 0); }); });',
    'page.waitForURL("/tasks");',
    // Promise ではない new
    'new Thing((resolve) => setTimeout(resolve, 50));',
  ],
  invalid: [
    {
      code: 'await new Promise((resolve) => setTimeout(resolve, 50));',
      errors: [{ messageId: 'sleep', data: { ms: '50' }, line: 1, column: 7 }],
    },
    {
      code: 'await new Promise(function (r) { setTimeout(r, 1000); });',
      errors: [{ messageId: 'sleep', data: { ms: '1000' } }],
    },
    {
      code: 'await new Promise((r) => setTimeout(() => r(1), DELAY));',
      errors: [{ messageId: 'sleep', data: { ms: 'DELAY' } }],
    },
    // 待つ時間を書かないと 0ms
    { code: 'await new Promise((r) => setTimeout(r));', errors: [{ messageId: 'sleep', data: { ms: '0' } }] },
    { code: 'await page.waitForTimeout(500);', errors: [{ messageId: 'waitForTimeout' }] },
  ],
});
