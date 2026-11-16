// @vitest-environment jsdom
// 第39章 練習問題5のテスト: npx vitest run form.test.js
import { beforeEach, expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/form.js で模範解答に替えられる
const mod = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './form.js', import.meta.url).pathname);
const { readTaskForm, showErrors } = mod;

let form;
beforeEach(() => {
  document.body.innerHTML = `
    <form>
      <input name="title" /><span data-error-for="title"></span>
      <input name="dueDate" /><span data-error-for="dueDate"></span>
    </form>`;
  form = document.querySelector('form');
});
const set = (name, value) => (form.elements.namedItem(name).value = value);

test('前後の空白を取った題名と、日付を読む', () => {
  set('title', '  牛乳を買う ');
  set('dueDate', '2026-11-20');
  expect(readTaskForm(form)).toEqual({ values: { title: '牛乳を買う', dueDate: '2026-11-20' }, errors: {} });
});

test('日付が空なら null', () => {
  set('title', 'A');
  expect(readTaskForm(form).values.dueDate).toBeNull();
});

test('題名が空・空白だけ・101 文字なら errors.title', () => {
  set('title', '   ');
  expect(readTaskForm(form).errors.title).toBe('題名を入れてください');
  set('title', 'あ'.repeat(101));
  expect(readTaskForm(form).errors.title).toBe('題名は 100 文字までです');
  set('title', 'あ'.repeat(100));
  expect(readTaskForm(form).errors.title).toBeUndefined();
});

test('日付が YYYY-MM-DD でなければ errors.dueDate', () => {
  set('title', 'A');
  set('dueDate', '11/20');
  expect(readTaskForm(form).errors).toEqual({ dueDate: '日付は YYYY-MM-DD です' });
});

test('showErrors: 文を入れ、無い項目は空にし、間違いがあったかを返す', () => {
  const spans = () => [...form.querySelectorAll('[data-error-for]')].map((s) => s.textContent);
  expect(showErrors(form, { title: 'だめ' })).toBe(true);
  expect(spans()).toEqual(['だめ', '']);
  expect(showErrors(form, {})).toBe(false);
  expect(spans()).toEqual(['', '']);
});
