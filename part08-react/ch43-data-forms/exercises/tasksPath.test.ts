// 第43章 練習問題3のテスト: npx vitest run tasksPath.test.ts
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/tasksPath.ts で模範解答に替えられる
const mod: typeof import('./tasksPath.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './tasksPath.ts', import.meta.url).pathname);
const { tasksPath } = mod;

test('何も指定しなければ /tasks', () => {
  expect(tasksPath()).toBe('/tasks');
  expect(tasksPath({})).toBe('/tasks');
});

test('API の決まりの値（-createdAt・20・空）は付けない', () => {
  expect(tasksPath({ statuses: [], sort: '-createdAt', limit: 20, dueBefore: null })).toBe('/tasks');
  expect(tasksPath({ dueBefore: '' })).toBe('/tasks');
});

test('status はカンマでつなぐ（%2C にエスケープされる）', () => {
  expect(tasksPath({ statuses: ['todo'] })).toBe('/tasks?status=todo');
  expect(tasksPath({ statuses: ['todo', 'doing'] })).toBe('/tasks?status=todo%2Cdoing');
});

test('status は todo・doing・done の順にそろえ、同じものは1つにする', () => {
  expect(tasksPath({ statuses: ['done', 'todo', 'done'] })).toBe('/tasks?status=todo%2Cdone');
});

test('並べる順: status・sort・due_before・limit', () => {
  expect(tasksPath({ limit: 100, sort: 'dueDate', dueBefore: '2026-12-01', statuses: ['doing'] })).toBe(
    '/tasks?status=doing&sort=dueDate&due_before=2026-12-01&limit=100',
  );
});
