// 第46章 練習問題3のテスト: npx vitest run routes.test.ts
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/routes.ts で模範解答に替えられる
const mod: typeof import('./routes.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './routes.ts', import.meta.url).pathname);
const { matchRoute } = mod;

test.each([
  ['/', { name: 'list' }],
  ['/tasks/new', { name: 'new' }],
  ['/tasks/3', { name: 'task', id: 3 }],
  ['/tasks/123456789', { name: 'task', id: 123456789 }],
  ['/tasks/0', { name: 'not-found' }],
  ['/tasks/03', { name: 'not-found' }],
  ['/tasks/abc', { name: 'not-found' }],
  ['/tasks', { name: 'not-found' }],
  ['/tasks/3/edit', { name: 'not-found' }],
  ['/about', { name: 'not-found' }],
])('%s', (path, route) => {
  expect(matchRoute(path)).toEqual(route);
});

test('最後に / が付いていたら、取った URL へ移す（redirect）', () => {
  expect(matchRoute('/tasks/3/')).toEqual({ name: 'redirect', to: '/tasks/3' });
  expect(matchRoute('/tasks//')).toEqual({ name: 'redirect', to: '/tasks' });
  expect(matchRoute('//')).toEqual({ name: 'redirect', to: '/' });
});
