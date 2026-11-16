// 第43章 練習問題のテストで使う道具（書き換えなくてよい。本文8節）
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

/** JSON の応答を作る */
export function jsonResponse(body: unknown, status = 200): Response {
  const type = status >= 400 ? 'application/problem+json' : 'application/json';
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': type } });
}

/** 後で返す（resolve を呼ぶまで待たせる）応答 */
export function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
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

/** テストごとに新しい QueryClient を作り、それで包む部品を返す。失敗しても、やり直さない */
export function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { queryClient, wrapper };
}
