// 第49章 練習問題1・2・8のテスト。練習用の API と、このフォルダの Next.js を起動して、HTTP で呼んで確かめる
//   動かし方:   npx vitest run app.test.ts            （全部）
//               npx vitest run app.test.ts -t 問題1   （問題1だけ）
//   模範解答:   APP=../solutions npx vitest run app.test.ts
//   使うポート: API 9536、Next.js 9537
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { startApi, startNext, type Server } from '../../tools/servers.ts';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 }); // 初めて呼ぶとき、Next.js が変換するので時間がかかる

const dir = fileURLToPath(new URL(process.env.APP ?? '.', import.meta.url));
let api: Server;
let next: Server;

beforeAll(async () => {
  api = await startApi(9536);
  next = await startNext(dir, 9537, { API_URL: api.url });
});
afterAll(async () => {
  await next?.stop();
  await api?.stop();
});

const call = (path: string, init?: RequestInit) => fetch(next.url + path, init);
const postJson = (path: string, body: string) => call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
const isProblem = (res: Response) => res.headers.get('content-type')?.startsWith('application/problem+json') === true;

describe('問題1 GET /api/hello', () => {
  test('名前が無ければ「こんにちは」', async () => {
    const res = await call('/api/hello');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/^application\/json/);
    expect(await res.json()).toEqual({ message: 'こんにちは' });
  });
  test('?name=alice なら「こんにちは、alice さん」', async () => {
    expect(await (await call('/api/hello?name=alice')).json()).toEqual({ message: 'こんにちは、alice さん' });
  });
  test('日本語の名前も、前後の空白を取って使う。空なら名前が無いのと同じ', async () => {
    expect(await (await call(`/api/hello?name=${encodeURIComponent(' ねこ ')}`)).json()).toEqual({ message: 'こんにちは、ねこ さん' });
    expect(await (await call('/api/hello?name=%20')).json()).toEqual({ message: 'こんにちは' });
  });
});

describe('問題2 POST /api/sum', () => {
  test('numbers の合計を返す', async () => {
    const res = await postJson('/api/sum', '{"numbers":[1,2,3.5]}');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sum: 6.5 });
  });
  test.each([
    ['JSON でない', 'あいう'],
    ['numbers が無い', '{}'],
    ['数でないものが入っている', '{"numbers":[1,"2"]}'],
    ['空の配列', '{"numbers":[]}'],
    ['101 個', JSON.stringify({ numbers: Array.from({ length: 101 }, () => 1) })],
  ])('%s なら 400 の problem+json', async (_name, body) => {
    const res = await postJson('/api/sum', body);
    expect(res.status).toBe(400);
    expect(isProblem(res)).toBe(true);
    const problem = (await res.json()) as { title?: unknown };
    expect(typeof problem.title).toBe('string');
  });
  test('100 個までは足せる', async () => {
    const res = await postJson('/api/sum', JSON.stringify({ numbers: Array.from({ length: 100 }, () => 2) }));
    expect(await res.json()).toEqual({ sum: 200 });
  });
  test('GET は 405', async () => {
    expect((await call('/api/sum')).status).toBe(405);
  });
});

describe('問題8 /api/tasks/[id]', () => {
  /** API に直接タスクを作る */
  async function makeTask(title: string): Promise<{ id: number; version: number }> {
    const res = await fetch(`${api.url}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
    return (await res.json()) as { id: number; version: number };
  }
  const del = (id: number | string, ifMatch?: string) => call(`/api/tasks/${id}`, { method: 'DELETE', headers: ifMatch === undefined ? {} : { 'If-Match': ifMatch } });

  test('GET: タスクを返す。無い・数字でない id は 404 の problem+json', async () => {
    const res = await call('/api/tasks/2');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: 2, title: '第9部を読む' });
    for (const id of ['999', 'abc', '0']) {
      const r = await call(`/api/tasks/${id}`);
      expect(r.status).toBe(404);
      expect(isProblem(r)).toBe(true);
    }
  });
  test('DELETE: If-Match が無ければ 428', async () => {
    const t = await makeTask('消す練習1');
    const res = await del(t.id);
    expect(res.status).toBe(428);
    expect(isProblem(res)).toBe(true);
  });
  test('DELETE: If-Match の形が "数" でなければ 400', async () => {
    const t = await makeTask('消す練習2');
    expect((await del(t.id, 'abc')).status).toBe(400);
  });
  test('DELETE: version が違えば 412（API の答えをそのまま返す）', async () => {
    const t = await makeTask('消す練習3');
    const res = await del(t.id, `"${t.version + 1}"`);
    expect(res.status).toBe(412);
    expect(isProblem(res)).toBe(true);
  });
  test('DELETE: 正しければ 204 で、API からも消える', async () => {
    const t = await makeTask('消す練習4');
    const res = await del(t.id, `"${t.version}"`);
    expect(res.status).toBe(204);
    expect((await fetch(`${api.url}/api/tasks/${t.id}`)).status).toBe(404);
  });
  test('DELETE: 無いタスクは 404', async () => {
    expect((await del(999, '"1"')).status).toBe(404);
    expect((await del('abc', '"1"')).status).toBe(404);
  });
});
