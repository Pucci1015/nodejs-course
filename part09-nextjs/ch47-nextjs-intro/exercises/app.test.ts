// 第47章 練習問題のテスト。練習用の API と、このフォルダの Next.js を起動して、ページを HTTP で読んで確かめる
//   動かし方:   npx vitest run app.test.ts            （全部）
//               npx vitest run app.test.ts -t 問題5   （問題5だけ）
//   模範解答:   APP=../solutions npx vitest run app.test.ts
//   使うポート: API 9516、Next.js 9517（npm run api や npx next dev を動かしたままでも、ぶつからない）
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { countItems, getPage, isNotFound, startApi, startNext, textOf, type Server } from '../../tools/servers.ts';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 }); // ページを初めて開くとき、Next.js が変換するので時間がかかる

const dir = fileURLToPath(new URL(process.env.APP ?? '.', import.meta.url));
let api: Server;
let next: Server;

beforeAll(async () => {
  api = await startApi(9516);
  next = await startNext(dir, 9517, { API_URL: api.url });
});
afterAll(async () => {
  await next?.stop();
  await api?.stop();
});

const open = (path: string) => getPage(next.url + path);
const titleOf = (html: string) => /<title>([^<]*)<\/title>/.exec(html)?.[1];

describe('問題1 /hello', () => {
  test('見出しが「こんにちは、Next.js」', async () => {
    const page = await open('/hello');
    expect(page.status).toBe(200);
    expect(page.html).toMatch(/<h1[^>]*>こんにちは、Next\.js<\/h1>/);
  });
});

describe('問題2 /about', () => {
  test('title が「このアプリについて | 練習問題」', async () => {
    const page = await open('/about');
    expect(page.status).toBe(200);
    expect(titleOf(page.html)).toBe('このアプリについて | 練習問題');
  });
  test('「ホームへ」というリンクが / を指す', async () => {
    const page = await open('/about');
    expect(page.html).toMatch(/<a [^>]*href="\/"[^>]*>ホームへ<\/a>/);
  });
});

describe('問題3 /greet/[name]', () => {
  test('/greet/alice は「こんにちは、alice さん」', async () => {
    expect(textOf((await open('/greet/alice')).html)).toContain('こんにちは、alice さん');
  });
  test('日本語の名前も、元の文字に戻して出す', async () => {
    expect(textOf((await open(`/greet/${encodeURIComponent('ねこ')}`)).html)).toContain('こんにちは、ねこ さん');
  });
});

describe('問題5 /tasks', () => {
  test('API のタスクの題名を、/tasks/id へのリンクで並べる', async () => {
    const { html, status } = await open('/tasks');
    expect(status).toBe(200);
    expect(html).toMatch(/<a [^>]*href="\/tasks\/1"[^>]*>牛乳を買う<\/a>/);
    expect(html).toMatch(/<a [^>]*href="\/tasks\/5"[^>]*>本を返す<\/a>/);
    expect(countItems(html)).toBe(5);
  });
});

describe('問題6 /tasks/[id]', () => {
  test('見出しが題名、状態を日本語で出す', async () => {
    const { html } = await open('/tasks/2');
    expect(html).toMatch(/<h1[^>]*>第9部を読む<\/h1>/);
    expect(textOf(html)).toContain('作業中');
  });
  test('無いタスク・数字でない id は「見つからない」', async () => {
    for (const id of ['99', 'abc', '0', '1.5']) {
      const page = await open(`/tasks/${id}`);
      expect(isNotFound(page), `/tasks/${id}`).toBe(true);
    }
    expect(isNotFound(await open('/tasks/1'))).toBe(false);
  });
});

describe('問題7 /tasks?status=…', () => {
  test('?status=doing なら、作業中のものだけ', async () => {
    const { html } = await open('/tasks?status=doing');
    expect(html).toContain('第9部を読む');
    expect(html).not.toMatch(/>牛乳を買う</);
  });
  test('絞り込みのリンクがあり、今の条件のリンクに aria-current="page" が付く', async () => {
    const { html } = await open('/tasks?status=todo');
    expect(html).toMatch(/<a [^>]*href="\/tasks"[^>]*>全部<\/a>/);
    expect(html).toMatch(/<a [^>]*href="\/tasks\?status=done"[^>]*>完了<\/a>/);
    expect(html).toMatch(/<a (?=[^>]*href="\/tasks\?status=todo")(?=[^>]*aria-current="page")[^>]*>未着手<\/a>/);
    expect(html).not.toMatch(/<a (?=[^>]*href="\/tasks")(?=[^>]*aria-current="page")[^>]*>全部<\/a>/);
  });
  test('知らない値は「全部」と同じ', async () => {
    const { html } = await open('/tasks?status=xyz');
    expect(countItems(html)).toBe(5);
    expect(html).toMatch(/<a (?=[^>]*href="\/tasks")(?=[^>]*aria-current="page")[^>]*>全部<\/a>/);
  });
});

describe('問題8 /tasks/[id] の title と、/pages のページ送り', () => {
  test('/tasks/1 の title が「牛乳を買う | 練習問題」', async () => {
    expect(titleOf((await open('/tasks/1')).html)).toBe('牛乳を買う | 練習問題');
  });
  test('/pages は3件ずつ。続きがあれば「次へ」のリンク', async () => {
    const first = await open('/pages');
    expect(countItems(first.html)).toBe(3);
    const next = /<a [^>]*href="(\/pages\?cursor=[^"]+)"[^>]*>次へ<\/a>/.exec(first.html);
    expect(next, '「次へ」のリンク').not.toBeNull();
    const second = await open(next![1]!.replaceAll('&amp;', '&'));
    expect(countItems(second.html)).toBe(2);
    expect(second.html).toContain('本を返す');
    expect(second.html).not.toMatch(/>次へ</);
  });
});
