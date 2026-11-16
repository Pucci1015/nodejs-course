// 第46章 練習問題1のテスト: npx vitest run serialize.test.ts
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/serialize.ts で模範解答に替えられる
const mod: typeof import('./serialize.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './serialize.ts', import.meta.url).pathname);
const { serializeForScript } = mod;

const data = { title: '<b>牛乳</b> & パン', note: 'a > b', lines: 'x\u2028y\u2029z', n: 1, list: [null, true] };

test('JSON として読み直すと、元のデータに戻る', () => {
  expect(JSON.parse(serializeForScript(data))).toEqual(data);
});

test('< > & は \\u003c \\u003e \\u0026 にする（HTML として意味を持たない）', () => {
  const s = serializeForScript(data);
  expect(s).not.toMatch(/[<>&]/);
  expect(s).toContain('\\u003cb\\u003e');
  expect(s).toContain('\\u0026');
});

test('U+2028・U+2029 も \\u2028・\\u2029 にする', () => {
  const s = serializeForScript(data);
  expect(s).not.toMatch(/[\u2028\u2029]/);
  expect(s).toContain('x\\u2028y\\u2029z');
});

test('JSON にできない値は TypeError', () => {
  expect(() => serializeForScript(undefined)).toThrow(TypeError);
});
