// @vitest-environment jsdom
// 第39章 練習問題6のテスト: npx vitest run view.test.js
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/view.js で模範解答に替えられる
const mod = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './view.js', import.meta.url).pathname);
const { renderView } = mod;

test('loading: <p class="loading">読み込み中…</p> だけ', () => {
  const root = document.createElement('div');
  root.innerHTML = '<p>前の中身</p>';
  renderView(root, { status: 'loading' });
  expect(root.children.length).toBe(1);
  expect(root.querySelector('p.loading')?.textContent).toBe('読み込み中…');
});

test('error: 文と「もう一度」のボタン。押すと onRetry', () => {
  const root = document.createElement('div');
  let retried = 0;
  renderView(root, { status: 'error', message: 'HTTP 500' }, { onRetry: () => retried++ });
  expect(root.querySelector('p.error')?.textContent).toBe('読み込めませんでした: HTTP 500');
  const button = root.querySelector('button');
  expect(button?.textContent).toBe('もう一度');
  button.click();
  expect(retried).toBe(1);
});

test('success: <ul> に題名の <li>（文字として）', () => {
  const root = document.createElement('div');
  renderView(root, { status: 'success', tasks: [{ id: 1, title: 'A' }, { id: 2, title: '<i>B</i>' }] });
  expect([...root.querySelectorAll('ul > li')].map((li) => li.textContent)).toEqual(['A', '<i>B</i>']);
  expect(root.querySelector('i')).toBeNull();
  expect(root.querySelector('p')).toBeNull();
});

test('知らない状態は Error を投げる', () => {
  const root = document.createElement('div');
  expect(() => renderView(root, { status: 'idle' })).toThrow();
});
