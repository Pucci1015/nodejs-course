// 第46章 練習問題2のテスト: npx vitest run head.test.ts
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/head.ts で模範解答に替えられる
const mod: typeof import('./head.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './head.ts', import.meta.url).pathname);
const { escapeHtml, renderHead } = mod;

test('escapeHtml: & < > " \' を変える', () => {
  expect(escapeHtml(`a & b < c > d "e" 'f'`)).toBe('a &amp; b &lt; c &gt; d &quot;e&quot; &#39;f&#39;');
});

test('escapeHtml: & を2回変えない', () => {
  expect(escapeHtml('<')).toBe('&lt;');
  expect(escapeHtml('&lt;')).toBe('&amp;lt;');
});

test('renderHead: title だけ', () => {
  expect(renderHead({ title: '牛乳を買う - タスク' })).toBe('<title>牛乳を買う - タスク</title>');
});

test('renderHead: description と noindex を、行を分けて足す', () => {
  expect(renderHead({ title: 'A & B', description: '"大事" なタスク', noindex: true })).toBe(
    ['<title>A &amp; B</title>', '<meta name="description" content="&quot;大事&quot; なタスク">', '<meta name="robots" content="noindex">'].join('\n'),
  );
});
