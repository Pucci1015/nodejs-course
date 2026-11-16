// @vitest-environment jsdom
// 第44章 練習問題3のテスト: npx vitest run TaskIdPage.test.tsx
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/TaskIdPage.tsx で模範解答に替えられる
const mod: typeof import('./TaskIdPage.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './TaskIdPage.tsx', import.meta.url).pathname);
afterEach(cleanup);
const { parseId, TaskIdPage } = mod;

test('parseId: 1 以上の整数の文字だけを数にする', () => {
  expect(parseId('3')).toBe(3);
  expect(parseId('123456789')).toBe(123456789);
  for (const s of [undefined, '', '0', '03', '-1', '1.5', 'abc', '1e3', '1234567890']) expect(parseId(s)).toBeNull();
});

const show = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/tasks/:id" element={<TaskIdPage />} />
      </Routes>
    </MemoryRouter>,
  );

test('/tasks/3 なら「タスク 3」', () => {
  show('/tasks/3');
  expect(screen.getByRole('heading').textContent).toBe('タスク 3');
});

test('/tasks/abc なら「ページが見つかりません」', () => {
  show('/tasks/abc');
  expect(screen.getByRole('heading').textContent).toBe('ページが見つかりません');
});
