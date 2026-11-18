// 追加（第12部）: 後ろで動かす仕事の部品の単体テスト。ストレージはメモリの偽物、「今」は決まった時刻
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { dayIn } from '../../src/jobs/digest.ts';
import { sendMailJob, type SentStore } from '../../src/jobs/mail.ts';
import { sweepOrphans } from '../../src/jobs/sweep.ts';
import { createMemoryBlobStore } from '../support/memory-blob-store.ts';

describe('dayIn: タイムゾーンでの日付', () => {
  test('UTC の 15:00 は、日本では次の日', () => {
    assert.equal(dayIn('Asia/Tokyo', new Date('2026-11-17T14:59:59Z')), '2026-11-17');
    assert.equal(dayIn('Asia/Tokyo', new Date('2026-11-17T15:00:00Z')), '2026-11-18');
    assert.equal(dayIn('UTC', new Date('2026-11-17T15:00:00Z')), '2026-11-17');
  });
});

describe('sweepOrphans: 孤児の掃除', () => {
  test('使われていない、置いてから時間のたったものだけを消す', async () => {
    let now = new Date('2026-11-18T00:00:00Z');
    const blobs = createMemoryBlobStore(() => now);
    await blobs.put('users/1/used.png', Buffer.from('u'), 'image/png');
    await blobs.put('users/1/orphan.png', Buffer.from('o'), 'image/png');
    now = new Date('2026-11-18T00:59:00Z');
    await blobs.put('users/1/fresh.png', Buffer.from('f'), 'image/png'); // 置いたばかり（行を入れる前かもしれない）
    now = new Date('2026-11-18T01:00:00Z');
    const r = await sweepOrphans({
      blobs,
      prefix: 'users/',
      isReferenced: async (key) => key === 'users/1/used.png',
      graceMs: 60 * 60 * 1000,
      now,
    });
    assert.deepEqual(r, { deleted: ['users/1/orphan.png'], scanned: 3 });
    assert.deepEqual(
      (await blobs.list('users/')).map((b) => b.key),
      ['users/1/fresh.png', 'users/1/used.png'],
    );
  });
});

describe('sendMailJob: 2 回送らない・直らない失敗は再試行しない', () => {
  const mail = { to: 'alice@example.com', subject: 's', text: 't' };
  const memorySent = (): SentStore & { keys: Set<string> } => {
    const keys = new Set<string>();
    return { keys, has: async (k) => keys.has(k), add: async (k) => void keys.add(k) };
  };

  test('同じ仕事の ID なら、2 回目は送らない', async () => {
    const sent = memorySent();
    const outbox: unknown[] = [];
    const mailer = { send: async (m: unknown) => void outbox.push(m) };
    assert.equal(await sendMailJob('7', mail, mailer, sent), 'sent');
    assert.equal(await sendMailJob('7', mail, mailer, sent), 'skipped');
    assert.equal(outbox.length, 1);
  });

  test('SMTP の 5xx は UnrecoverableError、4xx はそのまま（BullMQ が再試行する）', async () => {
    const fail = (responseCode: number) => ({
      send: async () => {
        throw Object.assign(new Error(`SMTP ${responseCode}`), { responseCode });
      },
    });
    await assert.rejects(sendMailJob('1', mail, fail(550), memorySent()), { name: 'UnrecoverableError' });
    await assert.rejects(sendMailJob('2', mail, fail(451), memorySent()), { name: 'Error', message: 'SMTP 451' });
  });
});
