// 第49章 練習問題3・5のテスト。Server Action を、ふつうの関数として呼んで確かめる
//   動かし方:   npx vitest run actions.test.ts            （全部）
//               npx vitest run actions.test.ts -t 問題5   （問題5だけ）
//   模範解答:   APP=../solutions npx vitest run actions.test.ts
//   使うポート: API 9538（問題5。app.test.ts と同時に動いても、ぶつからない）
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { startApi } from '../../tools/servers.ts';
import { startsWithDirective } from './check-directive.ts';

// Next.js の外で呼ぶので、Next.js の関数は偽物にする。redirect は、本物と同じく、投げて止める
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ refresh: vi.fn(), revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND');
  }),
}));
beforeEach(() => {
  vi.mocked(refresh).mockClear();
  vi.mocked(redirect).mockClear();
});

// 問題5 の Server Action が使う API を起動し、lib/api.ts が読む API_URL を、import する前に決めておく
const api = await startApi(9538);
process.env.API_URL = api.url;
afterAll(() => api.stop());

const base = new URL(process.env.APP ?? '.', import.meta.url);
const greetPath = new URL('app/greet/actions.ts', base.href + '/').pathname;
const renamePath = new URL('app/tasks/[id]/actions.ts', base.href + '/').pathname;
const greet: typeof import('./app/greet/actions.ts') = await import(/* @vite-ignore */ greetPath);
const rename: typeof import('./app/tasks/[id]/actions.ts') = await import(/* @vite-ignore */ renamePath);

/** { name: 'alice' } から FormData を作る */
function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe('問題3 greetAction', () => {
  test("ファイルの1行目が 'use server'", () => {
    expect(startsWithDirective(greetPath, 'use server')).toBe(true);
  });
  test('名前があれば「こんにちは、alice さん」（前後の空白は取る）', async () => {
    expect(await greet.greetAction('', form({ name: 'alice' }))).toBe('こんにちは、alice さん');
    expect(await greet.greetAction('', form({ name: '  ねこ ' }))).toBe('こんにちは、ねこ さん');
  });
  test('名前が無い・空白だけなら「名前を入れてください」', async () => {
    expect(await greet.greetAction('', form({}))).toBe('名前を入れてください');
    expect(await greet.greetAction('', form({ name: '   ' }))).toBe('名前を入れてください');
  });
  test('21 文字以上なら「名前は 20 文字までです」', async () => {
    expect(await greet.greetAction('', form({ name: 'あ'.repeat(20) }))).toBe(`こんにちは、${'あ'.repeat(20)} さん`);
    expect(await greet.greetAction('', form({ name: 'あ'.repeat(21) }))).toBe('名前は 20 文字までです');
  });
});

describe('問題5 renameTaskAction', () => {
  type Task = { id: number; title: string; version: number; status: string };
  const readTask = async (id: number) => (await (await fetch(`${api.url}/api/tasks/${id}`)).json()) as Task;
  async function makeTask(title: string): Promise<Task> {
    const res = await fetch(`${api.url}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
    return (await res.json()) as Task;
  }
  const prev = { error: null, title: '' };

  test("ファイルの1行目が 'use server'", () => {
    expect(startsWithDirective(renamePath, 'use server')).toBe(true);
  });
  test('題名を変え、refresh() を呼び、エラー無しと新しい題名を返す', async () => {
    const t = await makeTask('名前を変える1');
    const result = await rename.renameTaskAction(t.id, t.version, prev, form({ title: '  変えた題名1 ' }));
    expect(result).toEqual({ error: null, title: '変えた題名1' });
    expect((await readTask(t.id)).title).toBe('変えた題名1');
    expect(refresh).toHaveBeenCalled();
  });
  test('題名が空なら、API を呼ばずに「題名を入れてください」', async () => {
    const t = await makeTask('名前を変える2');
    const result = await rename.renameTaskAction(t.id, t.version, prev, form({ title: '  ' }));
    expect(result.error).toBe('題名を入れてください');
    expect((await readTask(t.id)).version).toBe(t.version);
  });
  test('101 文字なら「題名は 100 文字までです」で、打った題名を返す', async () => {
    const t = await makeTask('名前を変える3');
    const long = 'あ'.repeat(101);
    expect(await rename.renameTaskAction(t.id, t.version, prev, form({ title: long }))).toEqual({ error: '題名は 100 文字までです', title: long });
  });
  test('id・version が正の整数でなければ「送られた値が正しくありません」', async () => {
    for (const [id, version] of [
      [0, 1],
      [1.5, 1],
      [1, -1],
      [Number.NaN, 1],
    ] as const) {
      const result = await rename.renameTaskAction(id, version, prev, form({ title: 'x' }));
      expect(result.error).toBe('送られた値が正しくありません');
    }
  });
  test('version が古ければ（412）、API の理由を返し、refresh() も呼ぶ', async () => {
    const t = await makeTask('名前を変える4');
    const result = await rename.renameTaskAction(t.id, t.version + 1, prev, form({ title: '変えた題名4' }));
    expect(result).toEqual({ error: 'ほかの人が先に変えました。読み直してください', title: '変えた題名4' });
    expect(refresh).toHaveBeenCalled();
    expect((await readTask(t.id)).title).toBe('名前を変える4');
  });
  test('完了したタスク（409）や、無いタスク（404）も、API の理由を返す', async () => {
    const t = await makeTask('名前を変える5');
    const done = await fetch(`${api.url}/api/tasks/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'If-Match': `"${t.version}"` },
      body: JSON.stringify({ status: 'done' }),
    });
    const d = (await done.json()) as Task;
    expect((await rename.renameTaskAction(t.id, d.version, prev, form({ title: '変えた題名5' }))).error).toBe('完了したタスクは変えられません。先に status を戻してください');
    expect((await rename.renameTaskAction(9999, 1, prev, form({ title: '変えた題名6' }))).error).toBe('タスク 9999 はありません');
  });
});
