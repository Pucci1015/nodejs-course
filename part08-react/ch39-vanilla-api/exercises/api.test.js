// 第39章 練習問題3のテスト: npx vitest run api.test.js
import { expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/api.js で模範解答に替えられる
const mod = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './api.js', import.meta.url).pathname);
const { createApi, ApiError } = mod;

/** 偽物の fetch。呼ばれた URL と options を覚え、決めた応答を返す */
function fakeFetch(status, body) {
  const calls = [];
  const fn = async (url, options = {}) => {
    calls.push({ url, options });
    return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
  return Object.assign(fn, { calls });
}

const task = { id: 3, title: 'A', status: 'todo', dueDate: null, version: 4 };

test('list: /api/tasks?limit=100 を GET し、items を返す', async () => {
  const f = fakeFetch(200, { items: [task], nextCursor: null });
  const api = createApi('http://api.test', f);
  expect(await api.list()).toEqual([task]);
  expect(f.calls[0].url).toBe('http://api.test/api/tasks?limit=100');
  expect(f.calls[0].options.method ?? 'GET').toBe('GET');
});

test('create: JSON で POST し、作られたタスクを返す', async () => {
  const f = fakeFetch(201, task);
  const api = createApi('http://api.test', f);
  expect(await api.create({ title: 'A', dueDate: null })).toEqual(task);
  const { url, options } = f.calls[0];
  expect(url).toBe('http://api.test/api/tasks');
  expect(options.method).toBe('POST');
  expect(options.headers['Content-Type']).toBe('application/json');
  expect(JSON.parse(options.body)).toEqual({ title: 'A', dueDate: null });
});

test('update: PATCH に If-Match: "version" を付ける', async () => {
  const f = fakeFetch(200, { ...task, status: 'done', version: 5 });
  const api = createApi('http://api.test', f);
  const updated = await api.update(task, { status: 'done' });
  expect(updated.version).toBe(5);
  const { url, options } = f.calls[0];
  expect(url).toBe('http://api.test/api/tasks/3');
  expect(options.method).toBe('PATCH');
  expect(options.headers['If-Match']).toBe('"4"');
  expect(JSON.parse(options.body)).toEqual({ status: 'done' });
});

test('remove: DELETE に If-Match。204 なら undefined か null を返す', async () => {
  const f = fakeFetch(204);
  const api = createApi('http://api.test', f);
  expect(await api.remove(task)).toBeFalsy();
  expect(f.calls[0].options.method).toBe('DELETE');
  expect(f.calls[0].options.headers['If-Match']).toBe('"4"');
});

test('2xx でなければ ApiError（status・problem・message は detail）', async () => {
  const problem = { title: 'Precondition Failed', status: 412, detail: 'ほかの人が先に変えました' };
  const api = createApi('http://api.test', fakeFetch(412, problem));
  const err = await api.update(task, { title: 'B' }).catch((e) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err.status).toBe(412);
  expect(err.problem).toEqual(problem);
  expect(err.message).toBe('ほかの人が先に変えました');
});

test('detail が無ければ message は title', async () => {
  const api = createApi('http://api.test', fakeFetch(404, { title: 'Not Found', status: 404 }));
  const err = await api.list().catch((e) => e);
  expect(err.message).toBe('Not Found');
});
