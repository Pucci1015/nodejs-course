// @vitest-environment jsdom
// 第43章 練習問題8のテスト: npx vitest run useToggleDone.test.tsx
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { Task } from './schemas.ts';
import { createWrapper, deferred, jsonResponse, mockFetch } from './test-helpers.tsx';
// 確かめるファイル。MODULE=../solutions/useToggleDone.ts で模範解答に替えられる
const mod: typeof import('./useToggleDone.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './useToggleDone.ts', import.meta.url).pathname);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const { useToggleDone } = mod;
const key = ['tasks', 'list', 'all'] as const;
const tasks: Task[] = [
  { id: 1, title: '牛乳を買う', status: 'todo', dueDate: null, version: 3 },
  { id: 2, title: '本を返す', status: 'done', dueDate: null, version: 1 },
];
const statuses = (qc: ReturnType<typeof createWrapper>['queryClient']) => qc.getQueryData<Task[]>(key)?.map((t) => t.status);

test('If-Match に version を入れて、反対の status を PATCH する', async () => {
  const fetch = mockFetch(() => jsonResponse({ ...tasks[0], status: 'done', version: 4 }));
  const { wrapper, queryClient } = createWrapper();
  queryClient.setQueryData(key, tasks);
  const { result } = renderHook(() => useToggleDone(key), { wrapper });
  await act(() => result.current.mutateAsync(tasks[0]!));
  const [url, init] = fetch.mock.calls[0]!;
  expect(url).toBe('/api/tasks/1');
  expect(init!.method).toBe('PATCH');
  const headers = new Headers(init!.headers);
  expect(headers.get('If-Match')).toBe('"3"');
  expect(headers.get('Content-Type')).toBe('application/json');
  expect(JSON.parse(init!.body as string)).toEqual({ status: 'done' });
});

test('応答を待たずに、キャッシュの一覧を変える（楽観的な更新）', async () => {
  const d = deferred<Response>();
  mockFetch(() => d.promise);
  const { wrapper, queryClient } = createWrapper();
  queryClient.setQueryData(key, tasks);
  const { result } = renderHook(() => useToggleDone(key), { wrapper });
  act(() => result.current.mutate(tasks[1]!));
  await waitFor(() => expect(statuses(queryClient)).toEqual(['todo', 'todo']));
  // 元の配列は変えていない
  expect(tasks[1]!.status).toBe('done');
  await act(async () => d.resolve(jsonResponse({ ...tasks[1], status: 'todo', version: 2 })));
});

test('失敗したら、キャッシュを元に戻す', async () => {
  const d = deferred<Response>();
  mockFetch((_url, init) => (init.method === 'PATCH' ? d.promise : jsonResponse({ items: tasks, nextCursor: null })));
  const { wrapper, queryClient } = createWrapper();
  queryClient.setQueryData(key, tasks);
  const { result } = renderHook(() => useToggleDone(key), { wrapper });
  act(() => result.current.mutate(tasks[0]!));
  await waitFor(() => expect(statuses(queryClient)).toEqual(['done', 'done']));
  await act(async () => d.resolve(jsonResponse({ title: 'Precondition Failed', detail: 'ほかの人が先に変えました' }, 412)));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(statuses(queryClient)).toEqual(['todo', 'done']);
});

test('終わったら（成功でも失敗でも）、["tasks"] で始まるキャッシュを古いことにする', async () => {
  mockFetch(() => jsonResponse({ title: 'Internal Server Error' }, 500));
  const { wrapper, queryClient } = createWrapper();
  queryClient.setQueryData(key, tasks);
  queryClient.setQueryData(['tasks', 'list', 'done'], [tasks[1]]);
  const { result } = renderHook(() => useToggleDone(key), { wrapper });
  await act(async () => {
    await result.current.mutateAsync(tasks[0]!).catch(() => {});
  });
  await waitFor(() => expect(queryClient.getQueryState(['tasks', 'list', 'done'])?.isInvalidated).toBe(true));
  expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
});
