// 第46章 練習問題5のテスト: npx vitest run render.test.tsx
// （このテストは、ブラウザのかわりの jsdom を使わない。サーバと同じ Node.js の中で動く）
import { expect, test } from 'vitest';
import type { Task } from './pages.tsx';
// 確かめるファイル。MODULE=../solutions/render.tsx で模範解答に替えられる
const mod: typeof import('./render.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './render.tsx', import.meta.url).pathname);
const { render } = mod;
const tasks: Task[] = [
  { id: 1, title: '牛乳を買う', status: 'todo', dueDate: null },
  { id: 2, title: '<本>を返す', status: 'done', dueDate: null },
];

test('/ は一覧（200）', () => {
  const r = render('/', tasks);
  expect(r.status).toBe(200);
  expect(r.html).toContain('<h1>タスク（<!-- -->2<!-- --> 件）</h1>');
  expect(r.html).toContain('<a href="/tasks/1">牛乳を買う</a>');
});

test('/tasks/2 はそのタスク（200）。題名はエスケープされる', () => {
  const r = render('/tasks/2', tasks);
  expect(r).toEqual({ status: 200, html: '<h1>&lt;本&gt;を返す</h1>' });
});

test('無いタスクは「見つかりません」で 404', () => {
  expect(render('/tasks/9', tasks)).toEqual({ status: 404, html: '<h1>ページが見つかりません</h1>' });
});

test('知らない URL も 404', () => {
  for (const p of ['/nope', '/tasks/abc', '/tasks/1/x']) expect(render(p, tasks).status).toBe(404);
});
