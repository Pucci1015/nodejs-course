// @vitest-environment jsdom
// 練習問題2の模範解答: EditTitleForm のテスト
// 確かめ方（exercises で）: node ../../tools/check-tests.ts ../solutions/EditTitleForm.test.tsx --vitest
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';

const { EditTitleForm }: typeof import('../exercises/EditTitleForm.tsx') = await import(
  /* @vite-ignore */ new URL(process.env.MODULE ?? '../exercises/EditTitleForm.tsx', import.meta.url).pathname
);

afterEach(cleanup);

function deferred() {
  let resolve!: () => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** 描いて、よく使う部品を返す（追加: テストを短くするための関数） */
function setup(onSave: (title: string) => Promise<void> = vi.fn(async () => {})) {
  const user = userEvent.setup();
  const onCancel = vi.fn();
  const onSaveMock = vi.fn(onSave);
  render(<EditTitleForm initialTitle="牛乳を買う" onSave={onSaveMock} onCancel={onCancel} />);
  const input = screen.getByRole<HTMLInputElement>('textbox', { name: '題名' });
  return { user, onSave: onSaveMock, onCancel, input };
}

describe('EditTitleForm', () => {
  test('最初は、今の題名が入っている', () => {
    render(<EditTitleForm initialTitle="牛乳を買う" onSave={vi.fn(async () => {})} onCancel={vi.fn()} />);

    expect(screen.getByRole<HTMLInputElement>('textbox', { name: '題名' }).value).toBe('牛乳を買う');
  });

  // 追加: clear で消してから打つ。前後の空白は除いて渡す
  test('打ち直して「保存」で、前後の空白を除いた題名を onSave に渡す', async () => {
    const { user, onSave, onCancel, input } = setup();

    await user.clear(input);
    await user.type(input, '  豆乳を買う  ');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onSave).toHaveBeenCalledExactlyOnceWith('豆乳を買う');
    expect(onCancel).not.toHaveBeenCalled();
  });

  // 追加: 空なら送らない。理由は role="alert" で、欄は aria-invalid
  test('空なら onSave を呼ばず、理由を出す', async () => {
    const { user, onSave, input } = setup();

    await user.clear(input);
    await user.type(input, '   {Enter}');

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('題名を入れてください');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  // 追加: 前後の空白を足しただけなら「変わっていない」
  test('変わっていなければ、onSave を呼ばずに onCancel', async () => {
    const { user, onSave, onCancel, input } = setup();

    await user.type(input, '  {Enter}');

    expect(onSave).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // 追加: 保存の途中は押せない。終わったら戻る
  test('保存している間は、ボタンが「保存中…」で押せない', async () => {
    const saving = deferred();
    const { user, input } = setup(() => saving.promise);

    await user.type(input, '！{Enter}');

    expect(screen.getByRole<HTMLButtonElement>('button', { name: '保存中…' }).disabled).toBe(true);
    saving.resolve();
    expect((await screen.findByRole<HTMLButtonElement>('button', { name: '保存' })).disabled).toBe(false);
  });

  // 追加: 失敗したら理由を出し、打った値は残す
  test('保存に失敗したら、理由を出し、打った題名を残す', async () => {
    const saving = deferred();
    const { user, input } = setup(() => saving.promise);

    await user.type(input, '！{Enter}');
    saving.reject(new Error('同じ題名のタスクがあります'));

    expect((await screen.findByRole('alert')).textContent).toBe('同じ題名のタスクがあります');
    expect(input.value).toBe('牛乳を買う！');
  });

  // 追加: キーボードとボタンの両方で、やめられる
  test('Escape でも「やめる」でも、onCancel を呼ぶ', async () => {
    const { user, onSave, onCancel, input } = setup();

    await user.type(input, '{Escape}');
    await user.click(screen.getByRole('button', { name: 'やめる' }));

    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onSave).not.toHaveBeenCalled();
  });
});
