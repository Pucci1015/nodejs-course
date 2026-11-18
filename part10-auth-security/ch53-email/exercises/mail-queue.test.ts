// 練習問題7 のテスト
// 使い方: node --test mail-queue.test.ts
//   模範解答を試す: MODULE=../solutions/mail-queue.ts node --test mail-queue.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Mail } from './mailer.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './mail-queue.ts');
const { createMailQueue }: typeof import('./mail-queue.ts') = await import(pathToFileURL(file).href);

const mail = (to: string): Mail => ({ to, subject: 'テスト', text: 'テスト' });

/** 呼ばれた順と、同時にいくつ送っていたかを記録する send。1通に ms ミリ秒かかる */
function slowSender(ms = 20) {
  const order: string[] = [];
  let active = 0;
  let maxActive = 0;
  const send = async (m: Mail) => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, ms));
    order.push(m.to);
    active--;
  };
  return { send, order, maxActive: () => maxActive };
}

test('enqueue はすぐ戻り、送るのは後', async () => {
  const s = slowSender();
  const queue = createMailQueue(s.send);
  const started = Date.now();
  queue.enqueue(mail('alice@example.com'));
  assert.ok(Date.now() - started < 15, 'enqueue が送り終わるのを待っています');
  assert.deepEqual(s.order, []);
  await queue.idle();
  assert.deepEqual(s.order, ['alice@example.com']);
});

test('入れた順に、1通ずつ送る（同時に送らない）', async () => {
  const s = slowSender();
  const queue = createMailQueue(s.send);
  for (const to of ['a@example.com', 'b@example.com', 'c@example.com']) queue.enqueue(mail(to));
  assert.equal(queue.pending(), 2, '1通目は送っている途中なので、待っているのは 2');
  await queue.idle();
  assert.deepEqual(s.order, ['a@example.com', 'b@example.com', 'c@example.com']);
  assert.equal(s.maxActive(), 1);
  assert.equal(queue.pending(), 0);
});

test('送っている途中に足したものも送る', async () => {
  const s = slowSender();
  const queue = createMailQueue(s.send);
  queue.enqueue(mail('a@example.com'));
  await new Promise((resolve) => setTimeout(resolve, 5));
  queue.enqueue(mail('b@example.com'));
  await queue.idle();
  assert.deepEqual(s.order, ['a@example.com', 'b@example.com']);
});

test('失敗しても列は止まらず、onError に渡す', async () => {
  const failed: [string, unknown][] = [];
  const err = new Error('送れませんでした');
  const sent: string[] = [];
  const queue = createMailQueue(
    async (m) => {
      if (m.to === 'b@example.com') throw err;
      sent.push(m.to);
    },
    { onError: (m, e) => failed.push([m.to, e]) },
  );
  for (const to of ['a@example.com', 'b@example.com', 'c@example.com']) queue.enqueue(mail(to));
  await queue.idle();
  assert.deepEqual(sent, ['a@example.com', 'c@example.com']);
  assert.deepEqual(failed, [['b@example.com', err]]);
});

test('idle: 何も無ければすぐ解決する。何回呼んでも、いくつ待っても解決する', async () => {
  const s = slowSender(5);
  const queue = createMailQueue(s.send);
  await queue.idle();
  queue.enqueue(mail('a@example.com'));
  await Promise.all([queue.idle(), queue.idle()]);
  queue.enqueue(mail('b@example.com'));
  await queue.idle();
  assert.deepEqual(s.order, ['a@example.com', 'b@example.com']);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
