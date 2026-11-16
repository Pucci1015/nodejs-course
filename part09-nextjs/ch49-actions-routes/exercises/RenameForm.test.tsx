// @vitest-environment jsdom
// 第49章 練習問題6のテスト: npx vitest run RenameForm.test.tsx
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { RenameState } from './app/tasks/[id]/actions.ts';
import { startsWithDirective } from './check-directive.ts';
// 確かめるファイル。MODULE=../solutions/components/RenameForm.tsx で模範解答に替えられる
const path = new URL(process.env.MODULE ?? './components/RenameForm.tsx', import.meta.url).pathname;
const mod: typeof import('./components/RenameForm.tsx') = await import(/* @vite-ignore */ path);
afterEach(cleanup);
const { RenameForm } = mod;

/** 偽物の Server Action。呼ばれたら、テストが finish() を呼ぶまで終わらない */
function fakeAction() {
  let finish: (s: RenameState) => void = () => {};
  const action = vi.fn(
    (_prev: RenameState, _fd: FormData) =>
      new Promise<RenameState>((resolve) => {
        finish = resolve;
      }),
  );
  return { action, finish: (s: RenameState) => act(async () => finish(s)) };
}
const input = () => screen.getByRole<HTMLInputElement>('textbox', { name: '題名' });
const submit = () => act(async () => fireEvent.click(screen.getByRole('button')));

test("ファイルの1行目が 'use client'", () => {
  expect(startsWithDirective(path, 'use client')).toBe(true);
});

test('「題名」の入力欄に、今の題名が入っている。ボタンは「変える」', () => {
  render(<RenameForm title="牛乳を買う" action={vi.fn()} />);
  expect(input().value).toBe('牛乳を買う');
  expect(input().name).toBe('title');
  expect(screen.getByRole('button').textContent).toBe('変える');
});

test('送ると、打った題名が FormData で action に届く。送っている間、ボタンは「変えています…」で押せない', async () => {
  const { action, finish } = fakeAction();
  render(<RenameForm title="牛乳を買う" action={action} />);
  fireEvent.change(input(), { target: { value: '豆乳を買う' } });
  await submit();
  expect(action).toHaveBeenCalledTimes(1);
  const fd = action.mock.calls[0]?.[1];
  expect(fd?.get('title')).toBe('豆乳を買う');
  const button = screen.getByRole<HTMLButtonElement>('button');
  expect(button.textContent).toBe('変えています…');
  expect(button.disabled).toBe(true);
  await finish({ error: null, title: '豆乳を買う' });
  expect(screen.getByRole('button').textContent).toBe('変える');
});

test('エラーが返ると role="alert" で出し、返ってきた題名を入力欄に残す', async () => {
  const { action, finish } = fakeAction();
  render(<RenameForm title="牛乳を買う" action={action} />);
  fireEvent.change(input(), { target: { value: '  ' } });
  await submit();
  await finish({ error: '題名を入れてください', title: '  ' });
  expect(screen.getByRole('alert').textContent).toBe('題名を入れてください');
  expect(input().value).toBe('  ');
});

test('エラーが無ければ alert は出さない', async () => {
  const { action, finish } = fakeAction();
  render(<RenameForm title="牛乳を買う" action={action} />);
  await submit();
  await finish({ error: null, title: '牛乳を買う' });
  expect(screen.queryByRole('alert')).toBeNull();
});
