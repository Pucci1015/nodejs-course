// @vitest-environment jsdom
// 第45章 練習問題3のテスト: npx vitest run TextField.test.tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/TextField.tsx で模範解答に替えられる
const mod: typeof import('./TextField.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './TextField.tsx', import.meta.url).pathname);
afterEach(cleanup);
const { TextField } = mod;

// aria-describedby の id から、説明の文を集める
const description = (el: HTMLElement) =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent)
    .join(' / ');

function Field(props: { hint?: string; error?: string; required?: boolean }) {
  const [v, setV] = useState('');
  return <TextField label="題名" value={v} onChange={setV} {...props} />;
}

test('ラベルの文字で入力欄が見つかり、打った文字が入る', async () => {
  render(<Field />);
  const input = screen.getByLabelText<HTMLInputElement>('題名');
  await userEvent.type(input, '牛乳');
  expect(input.value).toBe('牛乳');
  expect(input.hasAttribute('aria-describedby')).toBe(false);
  expect(input.hasAttribute('aria-invalid')).toBe(false);
});

test('hint は説明としてつなぐ', () => {
  render(<Field hint="100 文字まで" />);
  expect(description(screen.getByRole('textbox'))).toBe('100 文字まで');
});

test('error があれば、説明に足し、aria-invalid="true"', () => {
  render(<Field hint="100 文字まで" error="題名を入れてください" />);
  const input = screen.getByRole('textbox');
  expect(description(input)).toBe('100 文字まで / 題名を入れてください');
  expect(input.getAttribute('aria-invalid')).toBe('true');
});

test('required なら入力欄に required。ラベルの * は読み上げない', () => {
  render(<Field required />);
  const input = screen.getByRole('textbox', { name: '題名' });
  expect(input.hasAttribute('required')).toBe(true);
  const star = screen.getByText('*', { exact: false });
  expect(star.closest('[aria-hidden="true"]')).not.toBeNull();
});

test('2つ置いても、id が重ならない', () => {
  render(
    <>
      <Field hint="A" />
      <Field hint="B" />
    </>,
  );
  const [a, b] = screen.getAllByRole('textbox');
  expect(a!.id).not.toBe(b!.id);
  expect([description(a!), description(b!)]).toEqual(['A', 'B']);
});
