// 第40章 練習問題3のテスト: npx vitest run api-url.test.ts
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/api-url.ts で模範解答に替えられる
const mod: typeof import('./api-url.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './api-url.ts', import.meta.url).pathname);
const { apiUrl } = mod;

test('base が空なら、/ から始まる URL（プロキシ用）', () => {
  expect(apiUrl('', '/api/tasks')).toBe('/api/tasks');
});

test('base の最後の / は1つにまとめる', () => {
  expect(apiUrl('http://127.0.0.1:9500', '/api/tasks')).toBe('http://127.0.0.1:9500/api/tasks');
  expect(apiUrl('http://127.0.0.1:9500/', '/api/tasks')).toBe('http://127.0.0.1:9500/api/tasks');
});

test('クエリを付ける。数と真偽値は文字にし、undefined と null は付けない', () => {
  expect(apiUrl('', '/api/tasks', { limit: 20, sort: '-dueDate', status: undefined, cursor: null, all: true })).toBe('/api/tasks?limit=20&sort=-dueDate&all=true');
});

test('クエリの値はエスケープする。空のクエリなら ? を付けない', () => {
  expect(apiUrl('', '/api/tasks', { q: '牛乳 & パン' })).toBe('/api/tasks?q=%E7%89%9B%E4%B9%B3+%26+%E3%83%91%E3%83%B3');
  expect(apiUrl('', '/api/tasks', { status: undefined })).toBe('/api/tasks');
});
