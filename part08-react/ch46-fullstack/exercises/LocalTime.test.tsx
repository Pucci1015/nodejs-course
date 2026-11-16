// @vitest-environment jsdom
// 第46章 練習問題6のテスト: npx vitest run LocalTime.test.tsx
import { act, cleanup } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, test, vi } from 'vitest';
// 確かめるファイル。MODULE=../solutions/LocalTime.tsx で模範解答に替えられる
const mod: typeof import('./LocalTime.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './LocalTime.tsx', import.meta.url).pathname);
afterEach(cleanup);
const { formatUtc, LocalTime, useHydrated } = mod;
const iso = '2026-11-11T16:10:38.925Z';

test('formatUtc', () => {
  expect(formatUtc(iso)).toBe('2026-11-11 16:10 UTC');
  expect(formatUtc('2026-01-02T03:04:05Z')).toBe('2026-01-02 03:04 UTC');
});

test('サーバでは、UTC の文字を <time datetime> で出す', () => {
  expect(renderToString(<LocalTime iso={iso} />)).toBe(`<time dateTime="${iso}">2026-11-11 16:10 UTC</time>`);
});

function Flag() {
  return <span>{useHydrated() ? 'yes' : 'no'}</span>;
}

test('サーバの HTML にハイドレーションしても食い違わず、その後でブラウザの時刻の書き方になる', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  container.innerHTML = renderToString(
    <p>
      <LocalTime iso={iso} /> <Flag />
    </p>,
  );
  expect(container.textContent).toBe('2026-11-11 16:10 UTC no');
  const onRecoverableError = vi.fn();
  let root!: ReturnType<typeof hydrateRoot>;
  await act(async () => {
    root = hydrateRoot(
      container,
      <p>
        <LocalTime iso={iso} /> <Flag />
      </p>,
      { onRecoverableError },
    );
  });
  // 食い違い（ハイドレーションのエラー）が無い
  expect(onRecoverableError).not.toHaveBeenCalled();
  const local = new Date(iso).toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' });
  expect(container.textContent).toBe(`${local} yes`);
  act(() => root.unmount());
});
