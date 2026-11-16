// 第48章 練習問題5のテスト。練習用の API と、このフォルダの Next.js を起動して、ページを HTTP で読んで確かめる
//   動かし方:   npx vitest run app.test.ts
//   模範解答:   APP=../solutions npx vitest run app.test.ts
//   使うポート: API 9526、Next.js 9527（npm run api や npx next dev を動かしたままでも、ぶつからない）
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { getPage, startApi, startNext, textOf, type Server } from '../../tools/servers.ts';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 }); // ページを初めて開くとき、Next.js が変換するので時間がかかる

const dir = fileURLToPath(new URL(process.env.APP ?? '.', import.meta.url));
let api: Server;
let next: Server;

beforeAll(async () => {
  api = await startApi(9526);
  next = await startNext(dir, 9527, { API_URL: api.url });
});
afterAll(async () => {
  await next?.stop();
  await api?.stop();
});

const titleOf = (html: string) => /<title>([^<]*)<\/title>/.exec(html)?.[1];

describe('問題5 /overview', () => {
  test('title が「概要 | 練習問題」で、見出しが「概要」', async () => {
    const { status, html } = await getPage(next.url + '/overview');
    expect(status).toBe(200);
    expect(titleOf(html)).toBe('概要 | 練習問題');
    expect(html).toMatch(/<h1[^>]*>概要<\/h1>/);
  });
  test('作業中のタスクの題名と、未着手の数が出る', async () => {
    const text = textOf((await getPage(next.url + '/overview')).html);
    expect(text).toContain('第9部を読む');
    expect(text).not.toContain('牛乳を買う'); // 未着手のタスクは並べない
    expect(text).toContain('未着手: 4 件');
  });
  test('2つの部分が、それぞれの <Suspense> の fallback を持つ（最初に送る HTML に入っている）', async () => {
    const { html } = await getPage(next.url + '/overview');
    expect(html).toContain('作業中のタスクを読んでいます…');
    expect(html).toContain('未着手を数えています…');
  });
});
