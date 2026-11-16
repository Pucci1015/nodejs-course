// @vitest-environment jsdom
// 第45章 練習問題6のテスト: npx vitest run ConfirmDialog.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useState } from 'react';
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
// 確かめるファイル。MODULE=../solutions/ConfirmDialog.tsx で模範解答に替えられる
const mod: typeof import('./ConfirmDialog.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './ConfirmDialog.tsx', import.meta.url).pathname);
afterEach(cleanup);
const { ConfirmDialog } = mod;

// jsdom には showModal・close が無いので、テストのために足す（開いているかを open で表すだけ）
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
});

function Page({ onConfirm = () => {} }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <StrictMode>
      <button type="button" onClick={() => setOpen(true)}>
        削除
      </button>
      <ConfirmDialog
        open={open}
        title="「牛乳を買う」を削除しますか？"
        confirmLabel="削除する"
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      >
        <p>元に戻せません。</p>
      </ConfirmDialog>
    </StrictMode>
  );
}
const dialog = () => document.querySelector('dialog')!;

test('最初は閉じていて、開くと showModal で開く', async () => {
  render(<Page />);
  expect(dialog().open).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: '削除' }));
  expect(dialog().open).toBe(true);
  expect(screen.getByText('元に戻せません。')).toBeTruthy();
});

test('ダイアログの名前は、見出しの文（aria-labelledby）', async () => {
  render(<Page />);
  await userEvent.click(screen.getByRole('button', { name: '削除' }));
  const id = dialog().getAttribute('aria-labelledby')!;
  expect(document.getElementById(id)?.textContent).toBe('「牛乳を買う」を削除しますか？');
  expect(document.getElementById(id)?.tagName).toBe('H2');
});

test('「削除する」で onConfirm、「キャンセル」で閉じる', async () => {
  const onConfirm = vi.fn();
  render(<Page onConfirm={onConfirm} />);
  await userEvent.click(screen.getByRole('button', { name: '削除' }));
  await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
  expect(dialog().open).toBe(false);
  expect(onConfirm).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: '削除' }));
  await userEvent.click(screen.getByRole('button', { name: '削除する' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(dialog().open).toBe(false);
});

test('Esc（cancel のイベント）では、ブラウザに閉じさせず、onCancel を呼ぶ', async () => {
  render(<Page />);
  await userEvent.click(screen.getByRole('button', { name: '削除' }));
  const ev = new Event('cancel', { cancelable: true });
  fireEvent(dialog(), ev);
  expect(ev.defaultPrevented).toBe(true);
  expect(dialog().open).toBe(false);
});

test('開いたら「キャンセル」にフォーカス。閉じたら、開く前の要素に戻す', async () => {
  render(<Page />);
  const opener = screen.getByRole('button', { name: '削除' });
  await userEvent.click(opener);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'キャンセル' }));
  await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }));
  expect(document.activeElement).toBe(opener);
});
