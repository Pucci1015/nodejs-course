// @vitest-environment jsdom
// 第41章 練習問題5のテスト: npx vitest run Stepper.test.tsx
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import type { Task } from './types.ts';
// 確かめるファイル。MODULE=../solutions/Stepper.tsx で模範解答に替えられる
const mod: typeof import('./Stepper.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './Stepper.tsx', import.meta.url).pathname);
afterEach(cleanup);
const t = (id: number, title: string, status: Task['status'] = 'todo', dueDate: string | null = null): Task => ({ id, title, status, dueDate });
void within; void userEvent; void screen;
const { Stepper } = mod;
const value = () => screen.getByLabelText('人数').textContent;

test('最初は initial（無ければ min）', () => {
  render(<Stepper label="人数" min={1} max={5} initial={3} />);
  expect(value()).toBe('3');
  cleanup();
  render(<Stepper label="人数" min={2} max={5} />);
  expect(value()).toBe('2');
});

test('+ で増え、− で減る', async () => {
  render(<Stepper label="人数" min={0} max={5} />);
  const plus = screen.getByRole('button', { name: '人数を増やす' });
  await userEvent.click(plus);
  await userEvent.click(plus);
  await userEvent.click(screen.getByRole('button', { name: '人数を減らす' }));
  expect(value()).toBe('1');
});

test('min では − を、max では + を押せない', async () => {
  render(<Stepper label="人数" min={0} max={2} />);
  const minus = screen.getByRole<HTMLButtonElement>('button', { name: '人数を減らす' });
  const plus = screen.getByRole<HTMLButtonElement>('button', { name: '人数を増やす' });
  expect(minus.disabled).toBe(true);
  await userEvent.click(plus);
  await userEvent.click(plus);
  expect(value()).toBe('2');
  expect(plus.disabled).toBe(true);
  expect(minus.disabled).toBe(false);
});

test('2つ置くと、それぞれ別の数を持つ', async () => {
  render(
    <>
      <Stepper label="大人" />
      <Stepper label="子ども" />
    </>,
  );
  await userEvent.click(screen.getByRole('button', { name: '大人を増やす' }));
  expect(screen.getByLabelText('大人').textContent).toBe('1');
  expect(screen.getByLabelText('子ども').textContent).toBe('0');
});
