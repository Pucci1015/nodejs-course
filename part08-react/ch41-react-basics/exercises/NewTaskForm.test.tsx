// @vitest-environment jsdom
// 第41章 練習問題6のテスト: npx vitest run NewTaskForm.test.tsx
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import type { Task } from './types.ts';
// 確かめるファイル。MODULE=../solutions/NewTaskForm.tsx で模範解答に替えられる
const mod: typeof import('./NewTaskForm.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './NewTaskForm.tsx', import.meta.url).pathname);
afterEach(cleanup);
const t = (id: number, title: string, status: Task['status'] = 'todo', dueDate: string | null = null): Task => ({ id, title, status, dueDate });
void within; void userEvent; void screen;
const { NewTaskForm } = mod;

function setup() {
  const added: unknown[] = [];
  render(<NewTaskForm onAdd={(input) => added.push(input)} />);
  return { added, title: screen.getByLabelText<HTMLInputElement>('題名'), due: screen.getByLabelText<HTMLInputElement>('締め切り') };
}

test('入れて「追加」を押すと、前後の空白を取った題名で onAdd。日付が空なら null', async () => {
  const { added, title } = setup();
  await userEvent.type(title, '  牛乳を買う ');
  await userEvent.click(screen.getByRole('button', { name: '追加' }));
  expect(added).toEqual([{ title: '牛乳を買う', dueDate: null }]);
});

test('締め切りも渡し、送った後は2つとも空にする', async () => {
  const { added, title, due } = setup();
  await userEvent.type(title, '本を返す');
  await userEvent.type(due, '2026-11-20');
  await userEvent.click(screen.getByRole('button', { name: '追加' }));
  expect(added).toEqual([{ title: '本を返す', dueDate: '2026-11-20' }]);
  expect(title.value).toBe('');
  expect(due.value).toBe('');
});

test('Enter でも送れる', async () => {
  const { added, title } = setup();
  await userEvent.type(title, '洗濯{Enter}');
  expect(added).toEqual([{ title: '洗濯', dueDate: null }]);
});

test('空なら送らず、role="alert" に「題名を入れてください」。直して送ると消える', async () => {
  const { added, title } = setup();
  await userEvent.type(title, '   ');
  await userEvent.click(screen.getByRole('button', { name: '追加' }));
  expect(added).toEqual([]);
  expect(screen.getByRole('alert').textContent).toBe('題名を入れてください');
  await userEvent.type(title, 'A{Enter}');
  expect(screen.queryByRole('alert')).toBeNull();
});

test('101 文字なら「題名は 100 文字までです」', async () => {
  const { added, title } = setup();
  await userEvent.click(title);
  await userEvent.paste('あ'.repeat(101));
  await userEvent.click(screen.getByRole('button', { name: '追加' }));
  expect(added).toEqual([]);
  expect(screen.getByRole('alert').textContent).toBe('題名は 100 文字までです');
});
