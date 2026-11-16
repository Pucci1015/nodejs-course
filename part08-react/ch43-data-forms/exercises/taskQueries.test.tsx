// @vitest-environment jsdom
// 第43章 練習問題6のテスト: npx vitest run taskQueries.test.tsx
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ApiError } from './api.ts';
import { createWrapper, jsonResponse, mockFetch } from './test-helpers.tsx';
// 確かめるファイル。MODULE=../solutions/taskQueries.ts で模範解答に替えられる
const mod: typeof import('./taskQueries.ts') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './taskQueries.ts', import.meta.url).pathname);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const { useTasks, useCreateTask, taskKeys } = mod;
const task = (id: number, title = `タスク ${id}`) => ({ id, title, status: 'todo', dueDate: null, version: 1 });
const page = (...items: unknown[]) => ({ items, nextCursor: null });

test('taskKeys', () => {
  expect(taskKeys.all).toEqual(['tasks']);
  expect(taskKeys.list('todo')).toEqual(['tasks', 'list', 'todo']);
});

test('useTasks("all"): status を付けずに読み、items を返す', async () => {
  const fetch = mockFetch(() => jsonResponse(page(task(1), task(2))));
  const { wrapper } = createWrapper();
  const { result } = renderHook(() => useTasks('all'), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.map((t) => t.id)).toEqual([1, 2]);
  const url = new URL(fetch.mock.calls[0]![0] as string, 'http://x');
  expect(url.pathname).toBe('/api/tasks');
  expect(url.searchParams.get('status')).toBeNull();
  expect(url.searchParams.get('sort')).toBe('dueDate');
  expect(url.searchParams.get('limit')).toBe('100');
});

test('useTasks("done"): ?status=done で読み、キャッシュのキーは taskKeys.list("done")', async () => {
  const fetch = mockFetch(() => jsonResponse(page(task(3))));
  const { wrapper, queryClient } = createWrapper();
  const { result } = renderHook(() => useTasks('done'), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(new URL(fetch.mock.calls[0]![0] as string, 'http://x').searchParams.get('status')).toBe('done');
  expect(queryClient.getQueryData(['tasks', 'list', 'done'])).toEqual([task(3)]);
});

test('useTasks: 応答の形が違えば error', async () => {
  mockFetch(() => jsonResponse({ items: [{ id: 'x' }] }));
  const { wrapper } = createWrapper();
  const { result } = renderHook(() => useTasks('all'), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
});

test('useCreateTask: JSON で POST し、成功したら一覧を読み直す', async () => {
  let items = [task(1)];
  const fetch = mockFetch((url, init) => {
    if (init.method === 'POST') {
      const body = JSON.parse(init.body as string) as { title: string };
      const created = task(2, body.title);
      items = [...items, created];
      return jsonResponse(created, 201);
    }
    return jsonResponse(page(...items));
  });
  const { wrapper } = createWrapper();
  const { result } = renderHook(() => ({ list: useTasks('all'), create: useCreateTask() }), { wrapper });
  await waitFor(() => expect(result.current.list.data).toHaveLength(1));
  await act(() => result.current.create.mutateAsync({ title: '本を返す', dueDate: null }));
  const post = fetch.mock.calls.find(([, init]) => init?.method === 'POST')!;
  expect(post[0]).toBe('/api/tasks');
  expect(new Headers(post[1]!.headers).get('Content-Type')).toBe('application/json');
  expect(JSON.parse(post[1]!.body as string)).toEqual({ title: '本を返す', dueDate: null });
  await waitFor(() => expect(result.current.list.data?.map((t) => t.title)).toEqual(['タスク 1', '本を返す']));
});

test('useCreateTask: 失敗は ApiError', async () => {
  mockFetch(() => jsonResponse({ title: 'Conflict', detail: '同じ題名の、終わっていないタスクがあります' }, 409));
  const { wrapper } = createWrapper();
  const { result } = renderHook(() => useCreateTask(), { wrapper });
  await act(async () => {
    await result.current.mutateAsync({ title: 'a', dueDate: null }).catch(() => {});
  });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBeInstanceOf(ApiError);
  expect((result.current.error as ApiError).status).toBe(409);
});
