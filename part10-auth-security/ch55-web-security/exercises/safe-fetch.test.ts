// 練習問題6 のテスト。本物の DNS と fetch の代わりに、決めた答えを返す関数を渡す
// 使い方: node --test safe-fetch.test.ts
//   模範解答を試す: MODULE=../solutions/safe-fetch.ts node --test safe-fetch.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './safe-fetch.ts');
const { safeFetch, OutboundError }: typeof import('./safe-fetch.ts') = await import(pathToFileURL(file).href);

/** 名前 → アドレス（説明用のアドレス 192.0.2.0/24・198.51.100.0/24 を「外のサーバ」として使う） */
const dns: Record<string, string[]> = {
  'img.example.com': ['192.0.2.10'],
  'cdn.example.com': ['198.51.100.7'],
  'two.example.com': ['192.0.2.11', '10.0.0.5'],
  'inside.example.com': ['192.168.1.20'],
  localhost: ['127.0.0.1', '::1'],
  '::1': ['::1'],
};
const lookup = async (host: string) => {
  const found = dns[host];
  if (found === undefined) throw new Error('ENOTFOUND');
  return found;
};

/** URL → 応答。呼ばれた URL を覚える */
function fakeFetch(routes: Record<string, () => Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const route = routes[url];
    if (route === undefined) return new Response('not found', { status: 404 });
    return route();
  };
  return { fn, calls };
}
const redirect = (to: string) => () => new Response(null, { status: 302, headers: { location: to } });

const reasonOf = (expected: string) => (err: unknown) => err instanceof OutboundError && err.reason === expected;

test('外のサーバなら取ってくる。fetch には redirect: manual を渡す', async () => {
  const f = fakeFetch({ 'https://img.example.com/cat.txt': () => new Response('ねこ') });
  assert.deepEqual(await safeFetch('https://img.example.com/cat.txt', { lookup, fetchFn: f.fn }), {
    url: 'https://img.example.com/cat.txt',
    status: 200,
    body: 'ねこ',
  });
  assert.equal(f.calls[0]?.init.redirect, 'manual');
});

test('url: https でない・ユーザー名・ポート・URL でない（fetch を呼ばない）', async () => {
  const f = fakeFetch({});
  for (const bad of ['http://img.example.com/', 'https://u:p@img.example.com/', 'https://img.example.com:8443/', 'not a url']) {
    await assert.rejects(safeFetch(bad, { lookup, fetchFn: f.fn }), reasonOf('url'), bad);
  }
  assert.equal(f.calls.length, 0);
});

test('blocked: 中の網（アドレスが1つでも）・自分。dns: 引けない', async () => {
  const f = fakeFetch({});
  for (const bad of ['https://two.example.com/', 'https://inside.example.com/', 'https://localhost/', 'https://[::1]/']) {
    await assert.rejects(safeFetch(bad, { lookup, fetchFn: f.fn }), reasonOf('blocked'), bad);
  }
  await assert.rejects(safeFetch('https://nowhere.example.com/', { lookup, fetchFn: f.fn }), reasonOf('dns'));
  assert.equal(f.calls.length, 0);
});

test('リダイレクトは自分でたどり、行き先も確かめる（相対の Location も）', async () => {
  const f = fakeFetch({
    'https://img.example.com/a': redirect('https://cdn.example.com/b'),
    'https://cdn.example.com/b': redirect('/c'),
    'https://cdn.example.com/c': () => new Response('とどいた'),
  });
  const r = await safeFetch('https://img.example.com/a', { lookup, fetchFn: f.fn });
  assert.deepEqual(r, { url: 'https://cdn.example.com/c', status: 200, body: 'とどいた' });
  assert.deepEqual(
    f.calls.map((c) => c.url),
    ['https://img.example.com/a', 'https://cdn.example.com/b', 'https://cdn.example.com/c'],
  );
});

test('リダイレクトの行き先が中の網なら blocked（そこへは送らない）', async () => {
  const f = fakeFetch({ 'https://img.example.com/a': redirect('https://inside.example.com/admin') });
  await assert.rejects(safeFetch('https://img.example.com/a', { lookup, fetchFn: f.fn }), reasonOf('blocked'));
  assert.equal(f.calls.length, 1);
});

test('リダイレクトは maxRedirects 回まで（既定 3）', async () => {
  const f = fakeFetch({
    'https://img.example.com/1': redirect('/2'),
    'https://img.example.com/2': redirect('/3'),
    'https://img.example.com/3': redirect('/4'),
    'https://img.example.com/4': redirect('/5'),
    'https://img.example.com/5': () => new Response('5'),
  });
  await assert.rejects(safeFetch('https://img.example.com/1', { lookup, fetchFn: f.fn }), reasonOf('too_many_redirects'));
  assert.equal((await safeFetch('https://img.example.com/2', { lookup, fetchFn: f.fn })).body, '5');
  await assert.rejects(safeFetch('https://img.example.com/4', { lookup, fetchFn: f.fn, maxRedirects: 0 }), reasonOf('too_many_redirects'));
});

test('too_large: Content-Length が maxBytes をこえる・読んだら maxBytes をこえた', async () => {
  const f = fakeFetch({
    'https://img.example.com/big': () => new Response('x'.repeat(10), { headers: { 'content-length': '2000000' } }),
    'https://img.example.com/stream': () => new Response(new Blob(['あいうえお']).stream()),
  });
  await assert.rejects(safeFetch('https://img.example.com/big', { lookup, fetchFn: f.fn }), reasonOf('too_large'));
  await assert.rejects(safeFetch('https://img.example.com/stream', { lookup, fetchFn: f.fn, maxBytes: 10 }), reasonOf('too_large'));
  assert.equal((await safeFetch('https://img.example.com/stream', { lookup, fetchFn: f.fn, maxBytes: 15 })).body, 'あいうえお');
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
