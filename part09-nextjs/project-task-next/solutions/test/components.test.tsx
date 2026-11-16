// @vitest-environment jsdom
// 画面の部品（Client Component）のテスト。Server Action と next/navigation は偽物にする
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { deleteTaskAction, setStatusAction, type FormState } from '../app/tasks/actions.ts';
import { DeleteButton } from '../components/DeleteButton.tsx';
import { DoneToggle } from '../components/DoneToggle.tsx';
import { StatusSelect } from '../components/StatusSelect.tsx';
import { TaskForm } from '../components/TaskForm.tsx';

vi.mock('../app/tasks/actions.ts', () => ({ setStatusAction: vi.fn(), deleteTaskAction: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: vi.fn() }));
const routerRefresh = vi.fn();
beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({ refresh: routerRefresh } as unknown as ReturnType<typeof useRouter>);
  vi.mocked(setStatusAction).mockReset();
  vi.mocked(deleteTaskAction).mockReset();
  routerRefresh.mockReset();
});
afterEach(cleanup);

// jsdom には <dialog> の showModal・close が無いので、open 属性を付け外しするだけのものを足す
if (!('showModal' in HTMLDialogElement.prototype)) {
  Object.assign(HTMLDialogElement.prototype, {
    showModal(this: HTMLDialogElement) {
      this.open = true;
    },
    close(this: HTMLDialogElement) {
      this.open = false;
    },
  });
}

const ok = { error: null };

test('DoneToggle: チェックすると setStatusAction(id, version, "done")。成功は role="status" で知らせる', async () => {
  vi.mocked(setStatusAction).mockResolvedValue(ok);
  render(<DoneToggle id={1} version={3} title="牛乳を買う" done={false} />);
  const box = screen.getByRole<HTMLInputElement>('checkbox', { name: '完了（牛乳を買う）' });
  await act(async () => fireEvent.click(box));
  expect(setStatusAction).toHaveBeenCalledWith(1, 3, 'done');
  expect(screen.getByRole('status').textContent).toBe('「牛乳を買う」を完了にしました');
});

test('DoneToggle: 断られたら、チェックを戻して role="alert" で理由を出す', async () => {
  vi.mocked(setStatusAction).mockResolvedValue({ error: 'ほかの人が先に変えました' });
  render(<DoneToggle id={1} version={3} title="牛乳を買う" done={false} />);
  const box = screen.getByRole<HTMLInputElement>('checkbox', { name: '完了（牛乳を買う）' });
  await act(async () => fireEvent.click(box));
  expect(box.checked).toBe(false);
  expect(screen.getByRole('alert').textContent).toBe('ほかの人が先に変えました');
});

test('StatusSelect: 選んだ状態を送る。断られたら元に戻して理由を出す', async () => {
  vi.mocked(setStatusAction).mockResolvedValue({ error: '作業中のタスクは 3 個までです' });
  render(<StatusSelect id={2} version={1} status="todo" />);
  const select = screen.getByRole<HTMLSelectElement>('combobox', { name: '状態' });
  await act(async () => fireEvent.change(select, { target: { value: 'doing' } }));
  expect(setStatusAction).toHaveBeenCalledWith(2, 1, 'doing');
  expect(select.value).toBe('todo');
  expect(screen.getByRole('alert').textContent).toContain('作業中のタスクは 3 個までです');
});

test('DeleteButton: 「消す」でダイアログを開き、ダイアログの「消す」で deleteTaskAction を呼ぶ', async () => {
  vi.mocked(deleteTaskAction).mockResolvedValue({ error: 'ほかの人が先に変えました' });
  render(<DeleteButton id={3} version={2} title="本を返す" />);
  fireEvent.click(screen.getByRole('button', { name: '消す' }));
  const dialog = screen.getByRole('dialog', { name: '「本を返す」を消しますか' });
  expect(dialog).toBeTruthy();
  const buttons = screen.getAllByRole('button', { name: '消す' });
  await act(async () => fireEvent.click(buttons.at(-1)!));
  expect(deleteTaskAction).toHaveBeenCalledWith(3, 2, '本を返す');
  // 戻ってきたら失敗。ダイアログを閉じて理由を出す
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('alert').textContent).toBe('ほかの人が先に変えました');
});

test('TaskForm: エラーの欄は aria-invalid と aria-describedby でエラー文につなぐ。打った値は残る', async () => {
  const action = vi.fn(
    async (_prev: FormState, fd: FormData): Promise<FormState> => ({
      errors: { title: '題名を入れてください' },
      values: { title: fd.get('title') as string, dueDate: fd.get('dueDate') as string },
    }),
  );
  render(<TaskForm action={action} initial={{ title: '', dueDate: '' }} submitLabel="作る" pendingLabel="作っています…" />);
  fireEvent.change(screen.getByLabelText('締め切り'), { target: { value: '2030-01-02' } });
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '作る' })));
  expect(action).toHaveBeenCalledOnce();
  const title = screen.getByRole('textbox', { name: '題名' });
  expect(title.getAttribute('aria-invalid')).toBe('true');
  const describedBy = title.getAttribute('aria-describedby') ?? '';
  expect(document.getElementById(describedBy)?.textContent?.trim()).toBe('題名を入れてください');
  expect(screen.getByLabelText<HTMLInputElement>('締め切り').value).toBe('2030-01-02');
});

test('TaskForm: stale（412）なら、フォーム全体のエラーと「読み直す」を出す。押すと router.refresh()', async () => {
  const action = vi.fn(
    async (): Promise<FormState> => ({ errors: { form: 'ほかの人が先に変えました' }, values: { title: 'x', dueDate: '' }, stale: true }),
  );
  render(<TaskForm action={action} initial={{ title: 'x', dueDate: '' }} submitLabel="保存" pendingLabel="保存しています…" />);
  expect(screen.queryByRole('button', { name: '読み直す' })).toBeNull();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '保存' })));
  expect(screen.getByRole('alert').textContent).toBe('ほかの人が先に変えました');
  fireEvent.click(screen.getByRole('button', { name: '読み直す' }));
  expect(routerRefresh).toHaveBeenCalledOnce();
});
