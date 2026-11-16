// 第50章 練習問題7のテスト。Server Action を、ふつうの関数として呼んで確かめる（第49章と同じ）
//   動かし方:   npx vitest run actions.test.ts
//   模範解答:   APP=../solutions npx vitest run actions.test.ts
//   使うポート: API 9548
import { refresh, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { startApi } from '../../tools/servers.ts';
import { startsWithDirective } from './check-directive.ts';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ refresh: vi.fn(), revalidatePath: vi.fn(), revalidateTag: vi.fn(), updateTag: vi.fn(), cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));
beforeEach(() => {
  vi.mocked(updateTag).mockClear();
  vi.mocked(refresh).mockClear();
  vi.mocked(redirect).mockClear();
});

const api = await startApi(9548);
process.env.API_URL = api.url;
afterAll(() => api.stop());

const path = new URL('app/count/actions.ts', new URL(process.env.APP ?? '.', import.meta.url).href + '/').pathname;
const mod: typeof import('./app/count/actions.ts') = await import(/* @vite-ignore */ path);
const { addTaskAction } = mod;
const form = (title: string) => {
  const fd = new FormData();
  fd.set('title', title);
  return fd;
};
const titles = async () => ((await (await fetch(`${api.url}/api/tasks?limit=100`)).json()) as { items: { title: string }[] }).items.map((t) => t.title);

describe('問題7 addTaskAction', () => {
  test("ファイルの1行目が 'use server'", () => {
    expect(startsWithDirective(path, 'use server')).toBe(true);
  });
  test("タスクを作り、updateTag('tasks') を呼んでから、/count に redirect する", async () => {
    await expect(addTaskAction(null, form('  ねこにごはん '))).rejects.toThrow('REDIRECT /count');
    expect(await titles()).toContain('ねこにごはん');
    expect(updateTag).toHaveBeenCalledWith('tasks');
    const tagged = vi.mocked(updateTag).mock.invocationCallOrder[0] ?? Infinity;
    const redirected = vi.mocked(redirect).mock.invocationCallOrder[0] ?? -Infinity;
    expect(tagged).toBeLessThan(redirected);
  });
  test('題名が空なら、作らずに「題名を入れてください」を返す', async () => {
    const before = (await titles()).length;
    expect(await addTaskAction(null, form('   '))).toBe('題名を入れてください');
    expect((await titles()).length).toBe(before);
    expect(updateTag).not.toHaveBeenCalled();
  });
  test('API が断ったら（同じ題名）、その理由を返し、updateTag は呼ばない', async () => {
    expect(await addTaskAction(null, form('牛乳を買う'))).toBe('同じ題名の、終わっていないタスクがあります');
    expect(updateTag).not.toHaveBeenCalled();
  });
});
