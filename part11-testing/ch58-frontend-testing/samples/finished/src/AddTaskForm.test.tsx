// 第58章 4節: 人と同じように打って押す（user-event）。送っている間・失敗したときも確かめる
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { AddTaskForm } from './AddTaskForm.tsx';

afterEach(cleanup);

/** 後で解決する Promise（送っている途中の様子を見るため） */
function deferred() {
  let resolve!: () => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('AddTaskForm', () => {
  test('打って Enter で、前後の空白を除いた題名を渡し、欄を空にする', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn(async () => {});
    render(<AddTaskForm onAdd={onAdd} />);

    const input = screen.getByRole<HTMLInputElement>('textbox', { name: '新しいタスク' });
    await user.type(input, '  牛乳を買う {Enter}');

    expect(onAdd).toHaveBeenCalledWith('牛乳を買う');
    expect(input.value).toBe('');
  });

  test('空のままなら送らず、理由を出して欄にフォーカスを戻す', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn(async () => {});
    render(<AddTaskForm onAdd={onAdd} />);

    await user.type(screen.getByRole('textbox', { name: '新しいタスク' }), '   ');
    await user.click(screen.getByRole('button', { name: '追加' }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('題名を入れてください');
    const input = screen.getByRole('textbox', { name: '新しいタスク' });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(input);
  });

  test('送っている間は、ボタンを押せない', async () => {
    const user = userEvent.setup();
    const sending = deferred();
    render(<AddTaskForm onAdd={() => sending.promise} />);

    await user.type(screen.getByRole('textbox', { name: '新しいタスク' }), '牛乳を買う');
    await user.click(screen.getByRole('button', { name: '追加' }));

    const button = screen.getByRole<HTMLButtonElement>('button', { name: '追加中…' });
    expect(button.disabled).toBe(true);

    sending.resolve();
    // 応答が来たら、元に戻る（findBy… は、出てくるまで待つ）
    expect((await screen.findByRole<HTMLButtonElement>('button', { name: '追加' })).disabled).toBe(false);
  });

  test('失敗したら、理由を出し、打った題名を残す', async () => {
    const user = userEvent.setup();
    render(<AddTaskForm onAdd={() => Promise.reject(new Error('同じ題名のタスクがあります'))} />);

    const input = screen.getByRole<HTMLInputElement>('textbox', { name: '新しいタスク' });
    await user.type(input, '牛乳を買う{Enter}');

    expect((await screen.findByRole('alert')).textContent).toBe('同じ題名のタスクがあります');
    expect(input.value).toBe('牛乳を買う');
  });
});
