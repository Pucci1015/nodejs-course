// 第58章 5節: 画面のテストの道具（jsonResponse・mockFetch・createWrapper は第8部 第43章と同じ。fakeTaskApi を足した）
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import type { Task } from './api.ts';

/** JSON の応答を作る。400 以上なら problem+json */
export function jsonResponse(body: unknown, status = 200): Response {
  const type = status >= 400 ? 'application/problem+json' : 'application/json';
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': type } });
}

/** fetch を偽物に替える。handler は (パス, init) を受け取り、Response を返す */
export function mockFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn((input: string | URL | Request, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    // AbortSignal で止められたら、本物の fetch と同じように AbortError で失敗する
    return new Promise<Response>((resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      Promise.resolve(handler(url, init)).then(resolve, reject);
    });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

/** テストごとに新しい QueryClient で包んで描く。失敗しても、やり直さない */
export function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { queryClient, wrapper };
}

export interface RecordedRequest {
  method: string;
  url: string;
  body: unknown;
}

/**
 * タスクの API の偽物。データを覚えていて、足す・変える・消すと、次の一覧に出る（本文5.3節）
 * override が Response を返したら、そちらを返す（失敗のまねに使う）
 */
export function fakeTaskApi(seed: Task[], override?: (method: string, url: string) => Response | undefined) {
  const tasks = seed.map((t) => ({ ...t }));
  let nextId = Math.max(0, ...tasks.map((t) => t.id)) + 1;
  const requests: RecordedRequest[] = [];

  const fetchMock = mockFetch((url, init) => {
    const method = init.method ?? 'GET';
    const body: unknown = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    requests.push({ method, url, body });
    const overridden = override?.(method, url);
    if (overridden) return overridden;

    if (url === '/api/tasks' && method === 'GET') return jsonResponse({ items: tasks });
    if (url === '/api/tasks' && method === 'POST') {
      const title = body !== null && typeof body === 'object' && 'title' in body ? String(body.title).trim() : '';
      if (title === '') {
        return jsonResponse({ title: '入力が正しくありません', errors: [{ pointer: '/title', detail: '題名を入れてください' }] }, 422);
      }
      const task = { id: nextId++, title, done: false };
      tasks.push(task);
      return jsonResponse(task, 201);
    }
    const id = Number(/^\/api\/tasks\/(\d+)$/.exec(url)?.[1]);
    const index = tasks.findIndex((t) => t.id === id);
    const task = tasks[index];
    if (task === undefined) return jsonResponse({ title: 'タスクが見つかりません' }, 404);
    if (method === 'PATCH') {
      task.done = body !== null && typeof body === 'object' && 'done' in body && body.done === true;
      return jsonResponse(task);
    }
    if (method === 'DELETE') {
      tasks.splice(index, 1);
      return jsonResponse(null, 204);
    }
    return jsonResponse({ title: 'Method Not Allowed' }, 405);
  });
  return { tasks, requests, fetchMock };
}
