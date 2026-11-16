// ページのテスト。偽の API と、このアプリの開発サーバを起動して、ページを HTTP で読んで確かめる
//   使うポート: 偽の API 9556、Next.js 9557（npm run dev（9550）を動かしたままでも、ぶつからない）
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { SEED } from './seed.ts';
import { getPage, isNotFound, startFakeApi, startNext, textOf } from './servers.ts';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 });

let api: Awaited<ReturnType<typeof startFakeApi>>;
let next: Awaited<ReturnType<typeof startNext>>;
beforeAll(async () => {
  api = await startFakeApi(9556, SEED);
  next = await startNext(9557, { API_URL: api.url });
});
afterAll(async () => {
  await next?.stop();
  await api?.stop();
});

const open = (path: string) => getPage(next.url + path);
const lastListCall = () => api.fake.calls.filter((c) => c.method === 'GET' && c.path.startsWith('/api/tasks?')).at(-1)?.path;
/** 一覧に出ている題名（リンクの文字）を、上から順に */
/** React は文字のつなぎ目に <!-- --> を入れるので、比べる前に取り除く */
const plain = (html: string) => html.replaceAll('<!-- -->', '');
/** チェックボックスの <input> を、value ごとに checked かどうかで */
const checkedOf = (html: string, value: string) =>
  [...html.matchAll(/<input type="checkbox" name="status"[^>]*>/g)].some((m) => m[0].includes(`value="${value}"`) && m[0].includes('checked'));
const titles = (html: string) => [...html.matchAll(/<a href="\/tasks\/\d+">([^<]+)<\/a>/g)].map((m) => m[1]);

describe('枠', () => {
  test('「本文へ」・メニューの「一覧」「新しいタスク」・<main id="main">', async () => {
    const { html } = await open('/tasks/new');
    expect(html).toMatch(/<a href="#main"[^>]*>本文へ<\/a>/);
    expect(html).toMatch(/<nav aria-label="メニュー">/);
    expect(html).toMatch(/<a [^>]*href="\/"[^>]*>一覧<\/a>/);
    expect(html).toMatch(/<a [^>]*href="\/tasks\/new"[^>]*>新しいタスク<\/a>/);
    expect(html).toMatch(/<main id="main">/);
  });
});

describe('一覧', () => {
  test('締め切りが近い順に並べ、API には sort=dueDate&limit=20 を送る', async () => {
    const { status, html } = await open('/');
    expect(status).toBe(200);
    expect(html).toMatch(/<h1[^>]*>タスク一覧<\/h1>/);
    expect(titles(html)).toEqual(['本を返す', '牛乳を買う', 'レポートを出す', 'Milk tea', '部屋の掃除']);
    expect(lastListCall()).toBe('/api/tasks?sort=dueDate&limit=20');
  });
  test('締め切りまでの日数を出す。完了したタスクには出さない', async () => {
    const text = textOf((await open('/')).html);
    expect(text).toContain('本を返す 2 日過ぎています');
    expect(text).toContain('牛乳を買う 今日まで');
    expect(text).toContain('レポートを出す あと 3 日');
  });
  test('タスクごとに「完了（題名）」のチェックがある', async () => {
    const text = textOf((await open('/')).html);
    expect(text).toContain('完了（牛乳を買う）');
    expect(text).toContain('完了（Milk tea）');
  });
  test('URL の条件（?status=todo,doing&sort=title）で読み、フォームにも出す', async () => {
    const { html } = await open('/?status=todo,doing&sort=title&status=xyz');
    expect(decodeURIComponent(lastListCall() ?? '')).toBe('/api/tasks?status=todo,doing&sort=title&limit=20');
    expect(titles(html)).toEqual(['レポートを出す', '本を返す', '牛乳を買う', '部屋の掃除']);
    expect(checkedOf(html, 'todo')).toBe(true);
    expect(checkedOf(html, 'doing')).toBe(true);
    expect(checkedOf(html, 'done')).toBe(false);
    expect(html).toMatch(/<option value="title" selected="">/);
  });
  test('フォームを送った形（?status=todo&status=done）でも読める', async () => {
    await open('/?status=todo&status=done');
    expect(decodeURIComponent(lastListCall() ?? '')).toBe('/api/tasks?status=todo,done&sort=dueDate&limit=20');
  });
  test('題名の絞り込み（?q=）は、大文字と小文字を区別しない。1つも無ければ「タスクはありません」', async () => {
    expect(titles((await open('/?q=MILK')).html)).toEqual(['Milk tea']);
    expect(textOf((await open('/?q=zzz')).html)).toContain('タスクはありません');
  });
  test('20 件より多ければ「次のページ」で続きを出す', async () => {
    for (let i = 1; i <= 20; i++) {
      await fetch(`${api.url}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `追加${i}`, dueDate: null }) });
    }
    const { html } = await open('/');
    expect(titles(html)).toHaveLength(20);
    const link = /<a href="([^"]+)">次のページ<\/a>/.exec(html)?.[1]?.replaceAll('&amp;', '&');
    expect(link).toBe('/?cursor=20');
    const rest = await open(link ?? '/');
    expect(titles(rest.html)).toHaveLength(5);
    expect(rest.html).not.toContain('次のページ');
    for (const [id, t] of api.fake.tasks) if (t.title.startsWith('追加')) api.fake.tasks.delete(id);
  });
  test('?deleted=題名 なら「「題名」を消しました」を role="status" で出す', async () => {
    const { html } = await open(`/?deleted=${encodeURIComponent('本を返す')}`);
    expect(plain(html)).toMatch(/<p role="status">「本を返す」を消しました<\/p>/);
  });
});

describe('作る・1つのタスク・見つからない', () => {
  test('/tasks/new: 見出し・「題名」「締め切り」・「作る」', async () => {
    const { html } = await open('/tasks/new');
    expect(html).toMatch(/<h1[^>]*>新しいタスク<\/h1>/);
    expect(html).toMatch(/<label for="[^"]+">題名<\/label>/);
    expect(html).toMatch(/<label for="[^"]+">締め切り<\/label>/);
    expect(html).toMatch(/<button type="submit"[^>]*>作る<\/button>/);
  });
  test('/tasks/4: 題名の見出し・日本の時刻の日時・「状態」で今の状態が選ばれている', async () => {
    const { html } = await open('/tasks/4');
    expect(html).toMatch(/<h1[^>]*>Milk tea<\/h1>/);
    const text = textOf(html);
    expect(text).toMatch(/作った日時 \d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}/);
    expect(text).toContain('完了した日時');
    expect(html).toMatch(/<option value="done" selected="">完了<\/option>/);
  });
  test('?created=1 なら「「題名」を作りました」', async () => {
    expect(plain((await open('/tasks/1?created=1')).html)).toMatch(/<p role="status">「牛乳を買う」を作りました<\/p>/);
  });
  test('無いタスク・数字でない id・無い URL は「見つからない」', async () => {
    for (const path of ['/tasks/999', '/tasks/abc', '/tasks/0', '/nope']) {
      expect(isNotFound(await open(path)), path).toBe(true);
    }
  });
});

describe('SSE の中継', () => {
  test('/api/events は text/event-stream で、API の知らせを流す', async () => {
    const controller = new AbortController();
    const res = await fetch(`${next.url}/api/events`, { signal: controller.signal });
    expect(res.headers.get('content-type')).toMatch(/^text\/event-stream/);
    const reader = res.body!.getReader();
    await fetch(`${api.url}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'SSE を試す', dueDate: null }) });
    let got = '';
    while (!got.includes('task.created')) {
      const { value, done } = await reader.read();
      if (done) break;
      got += new TextDecoder().decode(value);
    }
    expect(got).toContain('event: task.created');
    controller.abort();
  });
});
