// @vitest-environment jsdom
// 第43章 練習問題7のテスト: npx vitest run TaskForm.test.tsx
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { ApiError } from './api.ts';
import { deferred } from './test-helpers.tsx';
// 確かめるファイル。MODULE=../solutions/TaskForm.tsx で模範解答に替えられる
const mod: typeof import('./TaskForm.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './TaskForm.tsx', import.meta.url).pathname);
afterEach(cleanup);
const { TaskForm } = mod;
const title = () => screen.getByLabelText<HTMLInputElement>('題名');
const due = () => screen.getByLabelText<HTMLInputElement>('締め切り');
const alerts = () => screen.queryAllByRole('alert').map((a) => a.textContent);

test('空の題名は、送らずに間違いを出し、題名に aria-invalid を付ける', async () => {
  const onSubmit = vi.fn(async () => {});
  render(<TaskForm onSubmit={onSubmit} />);
  await userEvent.type(title(), '   ');
  await userEvent.click(screen.getByRole('button', { name: '追加' }));
  expect(alerts()).toEqual(['題名を入れてください']);
  expect(title().getAttribute('aria-invalid')).toBe('true');
  expect(onSubmit).not.toHaveBeenCalled();
});

test('確かめた後の値（前後の空白なし、締め切り無しは null）で onSubmit を呼び、空に戻す', async () => {
  const onSubmit = vi.fn(async () => {});
  render(<TaskForm onSubmit={onSubmit} />);
  await userEvent.type(title(), '  牛乳を買う ');
  await userEvent.click(screen.getByRole('button', { name: '追加' }));
  expect(onSubmit).toHaveBeenCalledWith({ title: '牛乳を買う', dueDate: null });
  await waitFor(() => expect(title().value).toBe(''));
  expect(alerts()).toEqual([]);
});

test('送っている間は、ボタンが「送信中…」で押せない', async () => {
  const d = deferred<void>();
  render(<TaskForm onSubmit={() => d.promise} />);
  await userEvent.type(title(), '本を返す');
  await userEvent.type(due(), '2099-01-01');
  await userEvent.click(screen.getByRole('button', { name: '追加' }));
  const button = screen.getByRole<HTMLButtonElement>('button', { name: '送信中…' });
  expect(button.disabled).toBe(true);
  d.resolve();
  await waitFor(() => expect(screen.getByRole<HTMLButtonElement>('button', { name: '追加' }).disabled).toBe(false));
});

test('API の 422 は、項目ごとに出す。入力は残す', async () => {
  const onSubmit = vi.fn(async () => {
    throw new ApiError(422, { errors: [{ pointer: '#/dueDate', detail: '締め切りが過ぎています' }] });
  });
  render(<TaskForm onSubmit={onSubmit} />);
  await userEvent.type(title(), '古いタスク');
  await userEvent.type(due(), '2020-01-01');
  await userEvent.click(screen.getByRole('button', { name: '追加' }));
  await waitFor(() => expect(alerts()).toEqual(['締め切りが過ぎています']));
  expect(due().getAttribute('aria-invalid')).toBe('true');
  expect(title().getAttribute('aria-invalid')).toBe('false');
  expect(title().value).toBe('古いタスク');
});

test('そのほかの失敗（409 など）は、フォーム全体の間違いとして文を出す', async () => {
  const onSubmit = vi.fn(async () => {
    throw new ApiError(409, { detail: '同じ題名の、終わっていないタスクがあります' });
  });
  render(<TaskForm onSubmit={onSubmit} submitLabel="保存" />);
  await userEvent.type(title(), '牛乳を買う');
  await userEvent.click(screen.getByRole('button', { name: '保存' }));
  await waitFor(() => expect(alerts()).toEqual(['同じ題名の、終わっていないタスクがあります']));
});
