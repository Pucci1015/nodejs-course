// @vitest-environment jsdom
// 第40章 練習問題8のテスト: npx vitest run mount.test.ts
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/mount.ts で模範解答に替えられる
const mod: typeof import('./mount.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './mount.ts', import.meta.url).pathname);
import type { Task, TaskApi } from './mount.ts';
const { mountApp } = mod;

const t = (id: number, title: string): Task => ({ id, title, status: 'todo', dueDate: null, version: 1 });

/** 偽物の API。create されたものを覚え、list で返す */
function fakeApi(initial: Task[] = []): TaskApi & { created: unknown[] } {
  const tasks = [...initial];
  const created: unknown[] = [];
  return {
    created,
    list: async () => [...tasks],
    create: async (input) => {
      created.push(input);
      const task = t(tasks.length + 1, input.title);
      tasks.push(task);
      return task;
    },
  };
}
const flush = () => new Promise((r) => setTimeout(r, 0));
const texts = (root: HTMLElement) => [...root.querySelectorAll('ul > li')].map((li) => li.textContent);

test('読み終えたら、一覧と件数を出す', async () => {
  const root = document.createElement('div');
  await mountApp(root, fakeApi([t(1, 'A'), t(2, '<b>B</b>')]));
  expect(texts(root)).toEqual(['A', '<b>B</b>']);
  expect(root.querySelector('p.status')?.textContent).toBe('2 件');
  expect(root.querySelector('form input[name="title"]')).not.toBeNull();
});

test('読んでいる間は「読み込み中…」', async () => {
  const root = document.createElement('div');
  let resolve: (v: Task[]) => void = () => {};
  const api = { ...fakeApi(), list: () => new Promise<Task[]>((r) => (resolve = r)) };
  const done = mountApp(root, api);
  expect(root.querySelector('p.status')?.textContent).toBe('読み込み中…');
  resolve([]);
  await done;
  expect(root.querySelector('p.status')?.textContent).toBe('0 件');
});

test('読めなければ「読み込めませんでした: 理由」', async () => {
  const root = document.createElement('div');
  await mountApp(root, { ...fakeApi(), list: async () => Promise.reject(new Error('HTTP 500')) });
  expect(root.querySelector('p.status')?.textContent).toBe('読み込めませんでした: HTTP 500');
});

test('送ると、前後の空白を取った題名で create し、入力を空にして読み直す', async () => {
  const root = document.createElement('div');
  const api = fakeApi([t(1, 'A')]);
  await mountApp(root, api);
  const input = root.querySelector('input');
  if (!input) throw new Error('input がありません');
  input.value = '  洗濯 ';
  root.querySelector('form')?.requestSubmit();
  await flush();
  await flush();
  expect(api.created).toEqual([{ title: '洗濯', dueDate: null }]);
  expect(texts(root)).toEqual(['A', '洗濯']);
  expect(input.value).toBe('');
});

test('空の題名は送らず、p.form-error に「題名を入れてください」', async () => {
  const root = document.createElement('div');
  const api = fakeApi();
  await mountApp(root, api);
  root.querySelector('form')?.requestSubmit();
  await flush();
  expect(api.created).toEqual([]);
  expect(root.querySelector('p.form-error')?.textContent).toBe('題名を入れてください');
});

test('create が失敗したら、その message を p.form-error に出す', async () => {
  const root = document.createElement('div');
  await mountApp(root, { ...fakeApi(), create: async () => Promise.reject(new Error('同じ題名があります')) });
  const input = root.querySelector('input');
  if (input) input.value = 'A';
  root.querySelector('form')?.requestSubmit();
  await flush();
  await flush();
  expect(root.querySelector('p.form-error')?.textContent).toBe('同じ題名があります');
});
