// @vitest-environment jsdom
// 第42章 練習問題7のテスト: npx vitest run TaskApp.test.tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test } from 'vitest';
import type { State } from './TaskApp.tsx';
// 確かめるファイル。MODULE=../solutions/TaskApp.tsx で模範解答に替えられる
const mod: typeof import('./TaskApp.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './TaskApp.tsx', import.meta.url).pathname);
afterEach(cleanup);
const { reducer, initialState, TaskApp } = mod;

const s0: State = Object.freeze({
  filter: 'all',
  tasks: Object.freeze([
    { id: 1, title: '牛乳を買う', done: false },
    { id: 5, title: '本を返す', done: true },
  ]) as State['tasks'],
});

describe('reducer', () => {
  test('initialState は、タスク無し・すべて', () => {
    expect(initialState).toEqual({ tasks: [], filter: 'all' });
  });

  test('added: 前後の空白を除いて、いちばん大きい id + 1 で足す', () => {
    const s = reducer(s0, { type: 'added', title: '  掃除 ' });
    expect(s.tasks.at(-1)).toEqual({ id: 6, title: '掃除', done: false });
    expect(reducer(initialState, { type: 'added', title: 'a' }).tasks[0]!.id).toBe(1);
    expect(s0.tasks).toHaveLength(2);
  });

  test('added・renamed: 題名が空白だけなら、同じ state をそのまま返す', () => {
    expect(reducer(s0, { type: 'added', title: '   ' })).toBe(s0);
    expect(reducer(s0, { type: 'renamed', id: 1, title: '' })).toBe(s0);
  });

  test('toggled・renamed・deleted', () => {
    expect(reducer(s0, { type: 'toggled', id: 1 }).tasks[0]!.done).toBe(true);
    expect(reducer(s0, { type: 'renamed', id: 5, title: ' 図書館 ' }).tasks[1]!.title).toBe('図書館');
    expect(reducer(s0, { type: 'deleted', id: 1 }).tasks.map((t) => t.id)).toEqual([5]);
  });

  test('cleared-done・filter-changed', () => {
    expect(reducer(s0, { type: 'cleared-done' }).tasks.map((t) => t.id)).toEqual([1]);
    const s = reducer(s0, { type: 'filter-changed', filter: 'done' });
    expect(s.filter).toBe('done');
    expect(s.tasks).toBe(s0.tasks);
  });
});

describe('TaskApp', () => {
  const titles = () => screen.queryAllByRole('listitem').map((li) => li.textContent);

  test('追加して、完了にして、絞り込んで、完了を消す', async () => {
    render(<TaskApp />);
    const input = screen.getByLabelText('題名');
    await userEvent.type(input, '牛乳を買う{Enter}');
    await userEvent.type(input, '本を返す{Enter}');
    expect(titles()).toEqual(['牛乳を買う', '本を返す']);
    expect((input as HTMLInputElement).value).toBe('');

    await userEvent.click(screen.getByRole('checkbox', { name: '本を返す' }));
    await userEvent.click(screen.getByRole('button', { name: '未完了' }));
    expect(titles()).toEqual(['牛乳を買う']);
    await userEvent.click(screen.getByRole('button', { name: '完了' }));
    expect(titles()).toEqual(['本を返す']);
    expect(screen.getByRole('button', { name: '完了' }).getAttribute('aria-pressed')).toBe('true');

    await userEvent.click(screen.getByRole('button', { name: 'すべて' }));
    await userEvent.click(screen.getByRole('button', { name: '完了を消す' }));
    expect(titles()).toEqual(['牛乳を買う']);
  });
});
