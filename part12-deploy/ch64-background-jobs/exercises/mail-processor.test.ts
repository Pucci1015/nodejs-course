// 練習問題6 のテスト: 本物の BullMQ と Redis（127.0.0.1:6380）で動かす
// 使い方: node --test mail-processor.test.ts
//   模範解答を試す: MODULE=../solutions/mail-processor.ts node --test mail-processor.test.ts
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Queue, QueueEvents, Worker, type Job } from 'bullmq';
import { createClient } from 'redis';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './mail-processor.ts');
const { createMailProcessor }: typeof import('./mail-processor.ts') = await import(pathToFileURL(file).href);

const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6380';
// テストごとのキーの頭（本文で作ったものに触らない）
const prefix = `test:${process.pid}:${randomBytes(3).toString('hex')}`;
const cleanups: (() => Promise<void>)[] = [];
after(async () => {
  for (const c of cleanups.reverse()) await c();
});

type Mail = { to: string; subject: string; text: string };

/** 偽のメールのサーバ。failFirst 回だけ失敗する */
function fakeMailer(failFirst = 0) {
  const sent: Mail[] = [];
  let calls = 0;
  return {
    sent,
    async send(mail: Mail) {
      calls += 1;
      if (calls <= failFirst) throw Object.assign(new Error('つながりません'), { code: 'ECONNREFUSED' });
      sent.push(mail);
    },
  };
}
function memorySent() {
  const keys = new Set<string>();
  return { keys, has: async (k: string) => keys.has(k), add: async (k: string) => void keys.add(k) };
}

/** 新しい列とワーカーを作り、仕事を1つ入れて、終わる（成功・あきらめ）まで待つ */
async function runOne(processor: (job: Job) => Promise<unknown>, data: unknown, attempts = 3) {
  const name = `mail-${randomBytes(3).toString('hex')}`;
  const conns = [createClient({ url: REDIS_URL }), createClient({ url: REDIS_URL }), createClient({ url: REDIS_URL })];
  const queue = new Queue(name, { connection: conns[0]!, prefix });
  const events = new QueueEvents(name, { connection: conns[1]!, prefix });
  const worker = new Worker(name, processor, { connection: conns[2]!, prefix });
  cleanups.push(async () => {
    await worker.close();
    await events.close();
    await queue.obliterate({ force: true });
    await queue.close();
    for (const c of conns) if (c.isOpen) await c.close();
  });
  await events.waitUntilReady();
  const job = await queue.add('welcome', data, { attempts, backoff: { type: 'fixed', delay: 50 } });
  const result = await job.waitUntilFinished(events, 10_000).then(
    (value: unknown) => ({ ok: true as const, value }),
    (err: unknown) => ({ ok: false as const, message: err instanceof Error ? err.message : String(err) }),
  );
  const finished = await queue.getJob(job.id!);
  return { result, attemptsMade: finished?.attemptsMade, jobId: job.id! };
}

const welcome = { to: 'alice@example.com', subject: 'ようこそ', text: '登録ありがとうございます' };

test('送って sent。送ったことを job の id で覚える', async () => {
  const mailer = fakeMailer();
  const sent = memorySent();
  const r = await runOne(createMailProcessor({ mailer, sent }), welcome);
  assert.deepEqual(r.result, { ok: true, value: 'sent' });
  assert.deepEqual(mailer.sent, [welcome]);
  assert.deepEqual([...sent.keys], [`mail:${r.jobId}`]);
});

test('送るのに失敗したら、再試行して送る（合わせて 1 通）', async () => {
  const mailer = fakeMailer(2);
  const r = await runOne(createMailProcessor({ mailer, sent: memorySent() }), welcome);
  assert.deepEqual(r.result, { ok: true, value: 'sent' });
  assert.equal(mailer.sent.length, 1);
  assert.equal(r.attemptsMade, 3);
});

test('送った後の処理が失敗して再試行されても、2 通目は送らない（skipped）', async () => {
  const mailer = fakeMailer();
  let afterCalls = 0;
  const processor = createMailProcessor({
    mailer,
    sent: memorySent(),
    afterSend: async () => {
      afterCalls += 1;
      if (afterCalls === 1) throw new Error('ログを書けません');
    },
  });
  const r = await runOne(processor, welcome);
  assert.deepEqual(r.result, { ok: true, value: 'skipped' });
  assert.equal(mailer.sent.length, 1);
});

test('データの形が違えば、再試行せずに 1 回であきらめる（UnrecoverableError）', async () => {
  const mailer = fakeMailer();
  const r = await runOne(createMailProcessor({ mailer, sent: memorySent() }), { to: 'not-an-email', subject: 'x', text: 'y' }, 5);
  assert.equal(r.result.ok, false);
  assert.equal(r.attemptsMade, 1);
  assert.equal(mailer.sent.length, 0);
});

test('宛先が無いと言われた（SMTP の 550）ら、再試行せずにあきらめる', async () => {
  const mailer = {
    sent: [] as Mail[],
    async send() {
      throw Object.assign(new Error('No such user'), { responseCode: 550 });
    },
  };
  const r = await runOne(createMailProcessor({ mailer, sent: memorySent() }), welcome, 5);
  assert.equal(r.result.ok, false);
  assert.equal(r.attemptsMade, 1);
});

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
