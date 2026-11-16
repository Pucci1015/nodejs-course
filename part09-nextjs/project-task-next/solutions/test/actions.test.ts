// Server Action のテスト。Next.js の外で、ふつうの関数として呼んで確かめる（第49章 練習問題5 と同じやり方）
//   使うポート: 偽の API 9558（pages.test.ts と同時に動いても、ぶつからない）
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { day, SEED } from './seed.ts';
import { startFakeApi } from './servers.ts';

// Next.js の関数は偽物にする。redirect は、本物と同じく、投げて止める
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));

// lib/api.ts が読む API_URL を、import する前に決めておく
const api = await startFakeApi(9558, SEED);
process.env.API_URL = api.url;
afterAll(() => api.stop());
const { createTaskAction, updateTaskAction, setStatusAction, deleteTaskAction } = await import('../app/tasks/actions.ts');

beforeEach(() => {
  vi.mocked(refresh).mockClear();
  vi.mocked(redirect).mockClear();
});

const empty = { errors: {}, values: { title: '', dueDate: '' } };
function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}
const writes = () => api.fake.calls.filter((c) => c.method !== 'GET');
const lastWrite = () => writes().at(-1);
const task = (id: number) => api.fake.tasks.get(id)!;

describe('createTaskAction（作る）', () => {
  test('題名が空なら、API に送らずに「題名を入れてください」。打った値は残す', async () => {
    const before = writes().length;
    const state = await createTaskAction(empty, form({ title: '  ', dueDate: day(1) }));
    expect(state.errors.title).toBe('題名を入れてください');
    expect(state.values).toEqual({ title: '  ', dueDate: day(1) });
    expect(writes()).toHaveLength(before);
  });
  test('API の 422（締め切りが過ぎている）は、締め切りの欄のエラーにする', async () => {
    const state = await createTaskAction(empty, form({ title: 'ねこのごはん', dueDate: day(-1) }));
    expect(state.errors.dueDate).toBe('締め切りが過ぎています');
  });
  test('API の 409（同じ題名）は、フォーム全体のエラーにする', async () => {
    const state = await createTaskAction(empty, form({ title: '牛乳を買う', dueDate: '' }));
    expect(state.errors.form).toBe('同じ題名の、終わっていないタスクがあります');
  });
  test('作れたら /tasks/番号?created=1 に移る。締め切りが空なら null で送る', async () => {
    await expect(createTaskAction(empty, form({ title: 'alice に返事', dueDate: '' }))).rejects.toThrow(/^REDIRECT \/tasks\/\d+\?created=1$/);
    expect(lastWrite()?.body).toEqual({ title: 'alice に返事', dueDate: null });
  });
  test('API が 500 なら、投げる（error.tsx が出る）', async () => {
    api.fake.failNext(500, '壊れました');
    await expect(createTaskAction(empty, form({ title: 'bob に電話', dueDate: '' }))).rejects.toThrow();
  });
});

describe('updateTaskAction（直す）', () => {
  test('変わった項目だけを、If-Match を付けて送り、refresh() を呼ぶ', async () => {
    const t = task(5);
    const state = await updateTaskAction(t.id, t.version, { title: t.title, dueDate: t.dueDate }, empty, form({ title: '部屋とねこの掃除', dueDate: '' }));
    expect(state.errors).toEqual({});
    expect(lastWrite()?.body).toEqual({ title: '部屋とねこの掃除' });
    expect(lastWrite()?.headers.get('if-match')).toBe(`"${t.version}"`);
    expect(refresh).toHaveBeenCalledOnce();
  });
  test('何も変わっていなければ、API に送らない', async () => {
    const t = task(2);
    const before = writes().length;
    await updateTaskAction(t.id, t.version, { title: t.title, dueDate: t.dueDate }, empty, form({ title: t.title, dueDate: t.dueDate ?? '' }));
    expect(writes()).toHaveLength(before);
    expect(refresh).not.toHaveBeenCalled();
  });
  test('412（ほかの人が先に変えた）なら stale: true。打った値は残し、refresh() は呼ばない', async () => {
    const t = task(2);
    api.fake.changeByOther(2, 'レポートを出す（bob）');
    const state = await updateTaskAction(t.id, t.version, { title: t.title, dueDate: t.dueDate }, empty, form({ title: 'レポートを直す', dueDate: '' }));
    expect(state.stale).toBe(true);
    expect(state.errors.form).toBe('ほかの人が先に変えました。読み直してから、もう一度やってください');
    expect(state.values.title).toBe('レポートを直す');
    expect(refresh).not.toHaveBeenCalled();
  });
  test('id や version が正しくなければ、API に送らない', async () => {
    const before = writes().length;
    const state = await updateTaskAction(-1, 1, { title: 'x', dueDate: null }, empty, form({ title: 'y', dueDate: '' }));
    expect(state.errors.form).toBe('送られた値が正しくありません');
    expect(writes()).toHaveLength(before);
  });
});

describe('setStatusAction（状態を変える）', () => {
  test('状態を送り、refresh() を呼ぶ', async () => {
    const t = task(1);
    expect(await setStatusAction(t.id, t.version, 'done')).toEqual({ error: null });
    expect(lastWrite()?.body).toEqual({ status: 'done' });
    expect(task(1).status).toBe('done');
    expect(refresh).toHaveBeenCalledOnce();
  });
  test('知らない状態なら、API に送らない', async () => {
    const before = writes().length;
    expect(await setStatusAction(1, task(1).version, 'sleeping')).toEqual({ error: '送られた値が正しくありません' });
    expect(writes()).toHaveLength(before);
  });
  test('API が断ったら（409 など）、その文を返し、refresh() で最新にする', async () => {
    api.fake.failNext(409, '作業中のタスクは 3 個までです');
    expect(await setStatusAction(3, task(3).version, 'doing')).toEqual({ error: '作業中のタスクは 3 個までです' });
    expect(refresh).toHaveBeenCalledOnce();
  });
});

describe('deleteTaskAction（消す）', () => {
  test('古い version なら 412 の文を返す', async () => {
    const result = await deleteTaskAction(4, task(4).version + 1, 'Milk tea');
    expect(result.error).toBe('ほかの人が先に変えました。読み直してから、もう一度やってください');
    expect(api.fake.tasks.has(4)).toBe(true);
  });
  test('消せたら /?deleted=題名 に移る', async () => {
    await expect(deleteTaskAction(4, task(4).version, 'Milk tea')).rejects.toThrow('REDIRECT /?deleted=Milk+tea');
    expect(api.fake.tasks.has(4)).toBe(false);
  });
});
