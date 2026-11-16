// @vitest-environment jsdom
// 第48章 練習問題3のテスト: npx vitest run Spoiler.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { startsWithUseClient } from './check-use-client.ts';
// 確かめるファイル。MODULE=../solutions/components/Spoiler.tsx で模範解答に替えられる
const path = new URL(process.env.MODULE ?? './components/Spoiler.tsx', import.meta.url).pathname;
const mod: typeof import('./components/Spoiler.tsx') = await import(/* @vite-ignore */ path);
afterEach(cleanup);
const { Spoiler } = mod;

// 答えの部分が隠れているか（自分か、外側のどれかに hidden が付いているか）
const isHidden = (text: string) => screen.getByText(text).closest('[hidden]') !== null;

test("ファイルの1行目が 'use client'", () => {
  expect(startsWithUseClient(path)).toBe(true);
});

test('最初は「答えを見る」ボタンがあり、答えは隠れている', () => {
  render(
    <Spoiler>
      <p>答えは 42</p>
    </Spoiler>,
  );
  const button = screen.getByRole('button', { name: '答えを見る' });
  expect(button.getAttribute('aria-expanded')).toBe('false');
  expect(isHidden('答えは 42')).toBe(true);
});

test('押すと答えが見え、ボタンは「答えを隠す」になる。もう一度押すと隠れる', () => {
  render(
    <Spoiler>
      <p>答えは 42</p>
    </Spoiler>,
  );
  fireEvent.click(screen.getByRole('button', { name: '答えを見る' }));
  const button = screen.getByRole('button', { name: '答えを隠す' });
  expect(button.getAttribute('aria-expanded')).toBe('true');
  expect(isHidden('答えは 42')).toBe(false);
  fireEvent.click(button);
  expect(screen.getByRole('button', { name: '答えを見る' }).getAttribute('aria-expanded')).toBe('false');
  expect(isHidden('答えは 42')).toBe(true);
});

test('ボタンの aria-controls が、答えの部分の id を指す', () => {
  render(
    <Spoiler>
      <p>答えは 42</p>
    </Spoiler>,
  );
  const id = screen.getByRole('button').getAttribute('aria-controls');
  expect(id).toBeTruthy();
  const region = document.getElementById(id ?? '');
  expect(region?.textContent).toBe('答えは 42');
});

test('2つ置いても、id がぶつからない', () => {
  render(
    <>
      <Spoiler>
        <p>1つ目</p>
      </Spoiler>
      <Spoiler>
        <p>2つ目</p>
      </Spoiler>
    </>,
  );
  const [a, b] = screen.getAllByRole('button').map((x) => x.getAttribute('aria-controls'));
  expect(a).not.toBe(b);
});
