// @vitest-environment jsdom
// 第39章 練習問題1のテスト: npx vitest run task-item.test.js
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/task-item.js で模範解答に替えられる
const mod = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './task-item.js', import.meta.url).pathname);
const { renderTask } = mod;

const task = { id: 7, title: '牛乳を買う', status: 'todo', dueDate: '2026-11-20', version: 1 };

test('<li> を返し、data-id と data-status を付ける', () => {
  const li = renderTask(task);
  expect(li.tagName).toBe('LI');
  expect(li.dataset.id).toBe('7');
  expect(li.dataset.status).toBe('todo');
});

test('題名は span.title に、文字として入れる', () => {
  const li = renderTask({ ...task, title: '<b>太字</b> & 本' });
  const span = li.querySelector('span.title');
  expect(span).not.toBeNull();
  expect(span.textContent).toBe('<b>太字</b> & 本');
  expect(li.querySelector('b')).toBeNull(); // HTML として読まれていない
});

test('締め切りがあれば <small>締め切り: 日付</small>', () => {
  const li = renderTask(task);
  expect(li.querySelector('small')?.textContent).toBe('締め切り: 2026-11-20');
});

test('締め切りが null なら <small> を作らない', () => {
  const li = renderTask({ ...task, dueDate: null });
  expect(li.querySelector('small')).toBeNull();
});

test('done なら class に done を足す。それ以外は足さない', () => {
  expect(renderTask({ ...task, status: 'done' }).classList.contains('done')).toBe(true);
  expect(renderTask(task).classList.contains('done')).toBe(false);
});
