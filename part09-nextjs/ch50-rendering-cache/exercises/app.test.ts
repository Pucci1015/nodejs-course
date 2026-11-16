// 第50章 練習問題1・2・3・5・6・8のテスト。練習用の API を起動し、このフォルダの Next.js を
// ビルドしてから（next build）本番のサーバ（next start）で動かして、HTTP で確かめる
//   動かし方:   npx vitest run app.test.ts            （全部。ビルドするので、始まるまで 30 秒ほどかかる）
//               npx vitest run app.test.ts -t 問題1   （問題1だけ。ビルドは全部のページで行う）
//   模範解答:   APP=../solutions npx vitest run app.test.ts
//   使うポート: API 9546、Next.js 9547
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { buildAndStartNext, getPage, isNotFound, startApi, textOf, type Server } from '../../tools/servers.ts';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 240_000 });

const dir = fileURLToPath(new URL(process.env.APP ?? '.', import.meta.url));
let api: Server;
let next: Server;

beforeAll(async () => {
  api = await startApi(9546);
  // ビルドのときにも API を読むので、API を先に起動しておく
  next = await buildAndStartNext(dir, 9547, { API_URL: api.url });
});
afterAll(async () => {
  await next?.stop();
  await api?.stop();
});

const text = async (path: string) => textOf((await getPage(next.url + path)).html);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** API に直接タスクを足す（Next.js は、変わったことを知らない） */
const addTask = (title: string) =>
  fetch(`${api.url}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
/** API に聞いた、今のタスクの数 */
const apiCount = async () => ((await (await fetch(`${api.url}/api/tasks?limit=100`)).json()) as { items: unknown[] }).items.length;
/** path を開き直しながら、pattern に合う文字が出るまで待つ（最大 timeoutMs） */
async function waitForText(path: string, pattern: string, timeoutMs = 10_000): Promise<string> {
  const end = Date.now() + timeoutMs;
  let last = '';
  while (Date.now() < end) {
    last = await text(path);
    if (last.includes(pattern)) return last;
    await sleep(300);
  }
  return last;
}

describe('問題1 /built', () => {
  test('ビルドした時刻を出し、何度開いても同じ', async () => {
    const first = /ビルドした時刻: (\S+)/.exec(await text('/built'))?.[1];
    expect(first).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    await sleep(1100);
    const second = /ビルドした時刻: (\S+)/.exec(await text('/built'))?.[1];
    expect(second).toBe(first);
  });
});

describe('問題2 /now', () => {
  test('見出しは「今」。開いた時刻は、開くたびに変わる', async () => {
    const { html } = await getPage(next.url + '/now');
    expect(html).toMatch(/<h1[^>]*>今<\/h1>/);
    const first = /開いた時刻: (\d{4}-\d{2}-\d{2}T\S+)/.exec(textOf(html))?.[1];
    expect(first).toBeDefined();
    await sleep(1100);
    const second = /開いた時刻: (\d{4}-\d{2}-\d{2}T\S+)/.exec(await text('/now'))?.[1];
    expect(second).toBeDefined();
    expect(second).not.toBe(first);
  });
});

describe('問題3 /fruits/[name]', () => {
  test('くだものの名前と色を出す', async () => {
    expect(await text('/fruits/apple')).toContain('りんご');
    expect(await text('/fruits/banana')).toContain('黄');
    const { html } = await getPage(next.url + '/fruits/cherry');
    expect(html).toMatch(/<h1[^>]*>さくらんぼ<\/h1>/);
  });
  test('一覧に無いくだものは「見つからない」', async () => {
    expect(isNotFound(await getPage(next.url + '/fruits/durian'))).toBe(true);
  });
  test('3つのページを、ビルドのときに作ってある（generateStaticParams）', () => {
    for (const name of ['apple', 'banana', 'cherry']) {
      expect(existsSync(`${dir}/.next-test/server/app/fruits/${name}.html`), name).toBe(true);
    }
  });
});

describe('問題5・6 /count と /api/revalidate', () => {
  test('問題5: ビルドのときの数「タスクは 5 件」を出す', async () => {
    expect(await text('/count')).toContain('タスクは 5 件');
  });
  test('問題5: API に直接足しても、覚えた数のまま', async () => {
    await addTask('キャッシュの練習1');
    await sleep(500);
    expect(await text('/count')).toContain('タスクは 5 件');
    expect(await text('/count')).toContain('タスクは 5 件');
  });
  test('問題6: 合言葉が違えば 401 の problem+json', async () => {
    const res = await fetch(`${next.url}/api/revalidate`, { method: 'POST', headers: { Authorization: 'Bearer xyz' } });
    expect(res.status).toBe(401);
    expect(res.headers.get('content-type')).toMatch(/^application\/problem\+json/);
  });
  test('問題6: 知らせると、新しい数になる', async () => {
    const res = await fetch(`${next.url}/api/revalidate`, { method: 'POST', headers: { Authorization: 'Bearer dev-only-revalidate-secret' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revalidated: true });
    const n = await apiCount();
    expect(await waitForText('/count', `タスクは ${n} 件`)).toContain(`タスクは ${n} 件`);
  });
});

describe('問題8 /fresh', () => {
  test('今の数を出し、API に足すと、知らせなくても数秒で新しくなる', async () => {
    const n = await apiCount();
    expect(await waitForText('/fresh', `タスクは ${n} 件`)).toContain(`タスクは ${n} 件`);
    await addTask('キャッシュの練習2');
    expect(await waitForText('/fresh', `タスクは ${n + 1} 件`)).toContain(`タスクは ${n + 1} 件`);
  });
  test('/count のほうは、知らせない限り変わらない', async () => {
    expect(await text('/count')).not.toContain(`タスクは ${await apiCount()} 件`);
  });
});
