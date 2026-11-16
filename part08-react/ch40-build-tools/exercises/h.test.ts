// @vitest-environment jsdom
// 第40章 練習問題6のテスト: npx vitest run h.test.ts
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/h.ts で模範解答に替えられる
const mod: typeof import('./h.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './h.ts', import.meta.url).pathname);
const { h, $ } = mod;

test('h(tag): その要素を作る。戻り値の型も tag で決まる', () => {
  const input = h('input');
  input.value = 'abc'; // HTMLInputElement なので value が使える
  expect(input.tagName).toBe('INPUT');
  expect(h('ul').tagName).toBe('UL');
});

test('props: className・id・dataset・attrs', () => {
  const li = h('li', { className: 'task done', id: 't1', dataset: { id: '1', status: 'done' }, attrs: { title: '説明', 'aria-label': '牛乳' } });
  expect(li.className).toBe('task done');
  expect(li.id).toBe('t1');
  expect(li.dataset.status).toBe('done');
  expect(li.getAttribute('title')).toBe('説明');
  expect(li.getAttribute('aria-label')).toBe('牛乳');
});

test('children: 要素・文字・数を順に入れる。null・undefined・false は飛ばす。文字は HTML にしない', () => {
  const ul = h('ul', null, h('li', null, 'A'), null, false, undefined, h('li', null, '<b>B</b>', ' ', 2));
  expect(ul.children.length).toBe(2);
  expect(ul.textContent).toBe('A<b>B</b> 2');
  expect(ul.querySelector('b')).toBeNull();
});

test('onClick: クリックで呼ばれる', () => {
  let n = 0;
  const b = h('button', { onClick: () => n++ }, '押す');
  b.click();
  b.click();
  expect(n).toBe(2);
});

test('$: 見つかれば返し、無ければ Error', () => {
  const root = h('div', null, h('p', { className: 'x' }, 'ある'));
  expect($('.x', root).textContent).toBe('ある');
  expect(() => $('.none', root)).toThrow('.none');
});
