// @vitest-environment jsdom
// 第43章 練習問題5のテスト: npx vitest run useTask.test.tsx
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { ApiError } from './api.ts';
import { deferred, jsonResponse, mockFetch } from './test-helpers.tsx';
// 確かめるファイル。MODULE=../solutions/useTask.ts で模範解答に替えられる
const mod: typeof import('./useTask.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './useTask.ts', import.meta.url).pathname);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const { useTask } = mod;
const task = (id: number) => ({ id, title: `タスク ${id}`, status: 'todo', dueDate: null, version: 1 });

test('id が null なら idle で、fetch しない', () => {
  const fetch = mockFetch(() => jsonResponse({}));
  const { result } = renderHook(() => useTask(null));
  expect(result.current).toEqual({ status: 'idle' });
  expect(fetch).not.toHaveBeenCalled();
});

test('/api/tasks/:id を読み、pending → success', async () => {
  const fetch = mockFetch(() => jsonResponse(task(3)));
  const { result } = renderHook(() => useTask(3), { wrapper: StrictMode });
  expect(result.current.status).toBe('pending');
  await waitFor(() => expect(result.current.status).toBe('success'));
  expect(result.current).toEqual({ status: 'success', task: task(3) });
  expect(fetch.mock.calls[0]![0]).toBe('/api/tasks/3');
});

test('失敗したら error（API の 404 は ApiError）', async () => {
  mockFetch(() => jsonResponse({ title: 'Not Found', detail: 'タスク 9 はありません' }, 404));
  const { result } = renderHook(() => useTask(9));
  await waitFor(() => expect(result.current.status).toBe('error'));
  const r = result.current;
  if (r.status !== 'error') throw new Error('error のはず');
  expect(r.error).toBeInstanceOf(ApiError);
  expect(r.error.message).toBe('タスク 9 はありません');
});

test('id が変わったら、すぐ pending に戻る', async () => {
  const later = deferred<Response>();
  mockFetch((url) => (url.endsWith('/1') ? jsonResponse(task(1)) : later.promise));
  const { result, rerender } = renderHook(({ id }) => useTask(id), { initialProps: { id: 1 } });
  await waitFor(() => expect(result.current.status).toBe('success'));
  rerender({ id: 2 });
  expect(result.current.status).toBe('pending');
  await act(async () => later.resolve(jsonResponse(task(2))));
  await waitFor(() => expect(result.current).toEqual({ status: 'success', task: task(2) }));
});

test('古い応答が後から届いても、今の id の結果を出す', async () => {
  const slow = deferred<Response>();
  const fast = deferred<Response>();
  mockFetch((url) => (url.endsWith('/1') ? slow.promise : fast.promise));
  const { result, rerender } = renderHook(({ id }) => useTask(id), { initialProps: { id: 1 } });
  rerender({ id: 2 });
  await act(async () => fast.resolve(jsonResponse(task(2))));
  await waitFor(() => expect(result.current.status).toBe('success'));
  // id 1 の応答が、後から届く
  await act(async () => slow.resolve(jsonResponse(task(1))));
  expect(result.current).toEqual({ status: 'success', task: task(2) });
});
