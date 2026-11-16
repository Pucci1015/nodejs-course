// 第46章 練習問題8のテスト: npx vitest run stream.test.tsx
import { PassThrough } from 'node:stream';
import { setTimeout as sleep } from 'node:timers/promises';
import { expect, test } from 'vitest';
import type { Stats } from './stream.tsx';
// 確かめるファイル。MODULE=../solutions/stream.tsx で模範解答に替えられる
const mod: typeof import('./stream.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './stream.tsx', import.meta.url).pathname);
const { streamStats } = mod;

test('先に見出しと「集計中…」を送り、集計ができたら残りを送る', async () => {
  let resolve!: (s: Stats) => void;
  const stats = new Promise<Stats>((r) => (resolve = r));
  const out = new PassThrough();
  let text = '';
  out.on('data', (chunk: Buffer) => (text += chunk.toString()));
  const finished = new Promise((r) => out.on('end', r));

  streamStats(stats, out);
  await sleep(50);
  // まだ集計はできていないが、ここまでは届いている
  expect(text).toContain('<h1>集計</h1>');
  expect(text).toContain('集計中…');
  expect(text).not.toContain('全部で');

  resolve({ total: 5, done: 2 });
  await finished;
  expect(text).toContain('全部で <!-- -->5<!-- --> 件、完了は <!-- -->2<!-- --> 件');
});

test('集計がすでにできていれば、待たずに全部送る', async () => {
  const out = new PassThrough();
  let text = '';
  out.on('data', (chunk: Buffer) => (text += chunk.toString()));
  const finished = new Promise((r) => out.on('end', r));
  streamStats(Promise.resolve({ total: 1, done: 1 }), out);
  await finished;
  expect(text).toContain('<h1>集計</h1>');
  expect(text).toContain('全部で <!-- -->1<!-- --> 件');
});
