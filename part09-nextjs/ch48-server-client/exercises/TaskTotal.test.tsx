// @vitest-environment jsdom
// 第48章 練習問題7のテスト: npx vitest run TaskTotal.test.tsx
import { act, cleanup, render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { afterEach, expect, test } from 'vitest';
import { startsWithUseClient } from './check-use-client.ts';
// 確かめるファイル。MODULE=../solutions/components/TaskTotal.tsx で模範解答に替えられる
const path = new URL(process.env.MODULE ?? './components/TaskTotal.tsx', import.meta.url).pathname;
const mod: typeof import('./components/TaskTotal.tsx') = await import(/* @vite-ignore */ path);
afterEach(cleanup);
const { TaskTotal } = mod;

test("ファイルの1行目が 'use client'", () => {
  expect(startsWithUseClient(path)).toBe(true);
});

test('Promise が終わるまでは、外の <Suspense> の fallback が出る', async () => {
  const total = new Promise<number>(() => {}); // いつまでも終わらない Promise
  await act(async () => {
    render(
      <Suspense fallback={<p>数えています…</p>}>
        <TaskTotal total={total} />
      </Suspense>,
    );
  });
  expect(screen.getByText('数えています…')).toBeTruthy();
});

test('終わると「タスクの数: 7」', async () => {
  let resolve: (n: number) => void = () => {};
  const total = new Promise<number>((r) => (resolve = r));
  await act(async () => {
    render(
      <Suspense fallback={<p>数えています…</p>}>
        <TaskTotal total={total} />
      </Suspense>,
    );
  });
  await act(async () => resolve(7));
  expect(screen.getByText('タスクの数: 7')).toBeTruthy();
  expect(screen.queryByText('数えています…')).toBeNull();
});
