// @vitest-environment jsdom
// 第48章 練習問題8のテスト: npx vitest run LiveRefresh.test.tsx
import { cleanup, render } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { StrictMode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { startsWithUseClient } from './check-use-client.ts';

// next/navigation を偽物にする。router.refresh() が呼ばれた回数を数える
vi.mock('next/navigation', () => ({ useRouter: vi.fn() }));
const refresh = vi.fn();
// 使う関数だけを持つ偽物（型は本物の router のふりをさせる）
const router = { refresh, push: vi.fn(), replace: vi.fn() } as unknown as ReturnType<typeof useRouter>;

// 偽物の EventSource。作られたものを sources に覚え、テストから知らせを送れる
class FakeEventSource {
  url: string;
  closed = false;
  listeners = new Map<string, Set<(e: MessageEvent) => void>>();
  constructor(url: string) {
    this.url = url;
    sources.push(this);
  }
  addEventListener(type: string, fn: (e: MessageEvent) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)?.add(fn);
  }
  removeEventListener(type: string, fn: (e: MessageEvent) => void) {
    this.listeners.get(type)?.delete(fn);
  }
  close() {
    this.closed = true;
  }
  /** テストから知らせを送る（閉じたものには届かない） */
  emit(type: string) {
    if (this.closed) return;
    for (const fn of this.listeners.get(type) ?? []) fn(new MessageEvent(type, { data: '{}' }));
  }
}
let sources: FakeEventSource[] = [];
const open = () => sources.filter((s) => !s.closed);

beforeEach(() => {
  sources = [];
  refresh.mockReset();
  vi.mocked(useRouter).mockReturnValue(router);
  vi.stubGlobal('EventSource', FakeEventSource);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// 確かめるファイル。MODULE=../solutions/components/LiveRefresh.tsx で模範解答に替えられる
const path = new URL(process.env.MODULE ?? './components/LiveRefresh.tsx', import.meta.url).pathname;
const mod: typeof import('./components/LiveRefresh.tsx') = await import(/* @vite-ignore */ path);
const { LiveRefresh } = mod;
const URL_ = 'http://localhost:9500/api/events';
// StrictMode で描く（後片付けを忘れると、つながりが2つ残る）
const show = () =>
  render(
    <StrictMode>
      <LiveRefresh url={URL_} />
    </StrictMode>,
  );

test("ファイルの1行目が 'use client'", () => {
  expect(startsWithUseClient(path)).toBe(true);
});

test('画面には何も出さない', () => {
  const { container } = show();
  expect(container.innerHTML).toBe('');
});

test('url に EventSource で1つだけつなぐ', () => {
  show();
  expect(open()).toHaveLength(1);
  expect(open()[0]?.url).toBe(URL_);
});

test('task.created・task.updated・task.deleted を受けるたびに router.refresh() を呼ぶ', () => {
  show();
  const source = open()[0];
  source?.emit('task.created');
  expect(refresh).toHaveBeenCalledTimes(1);
  source?.emit('task.updated');
  source?.emit('task.deleted');
  expect(refresh).toHaveBeenCalledTimes(3);
});

test('関係のない知らせでは呼ばない', () => {
  show();
  open()[0]?.emit('shutdown');
  expect(refresh).not.toHaveBeenCalled();
});

test('画面から消えたら、つながりを閉じる', () => {
  const { unmount } = show();
  unmount();
  expect(open()).toHaveLength(0);
});
