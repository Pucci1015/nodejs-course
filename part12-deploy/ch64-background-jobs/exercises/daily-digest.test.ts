// 練習問題8 のテスト（第6部の compose の PostgreSQL を動かしておく）
// 使い方: node --test daily-digest.test.ts
//   模範解答を試す: MODULE=../solutions/daily-digest.ts node --test daily-digest.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type pg from 'pg';
import { withTestSchema } from './pg-test.ts';
import { typeErrors } from './typecheck.ts';

const file = path.resolve(import.meta.dirname, process.env.MODULE ?? './daily-digest.ts');
const { sendDailyDigests }: typeof import('./daily-digest.ts') = await import(pathToFileURL(file).href);

type Mail = { to: string; subject: string; text: string };

async function seed(pool: pg.Pool, s: string) {
  await pool.query(`
    CREATE TABLE ${s}.users (id bigint PRIMARY KEY, email text NOT NULL);
    CREATE TABLE ${s}.tasks (id bigserial PRIMARY KEY, owner_id bigint NOT NULL REFERENCES ${s}.users,
                             title text NOT NULL, status text NOT NULL, due_date date);
    CREATE TABLE ${s}.digest_log (user_id bigint NOT NULL, day date NOT NULL, sent_at timestamptz NOT NULL DEFAULT now(),
                                  PRIMARY KEY (user_id, day));
    INSERT INTO ${s}.users VALUES (1, 'alice@example.com'), (2, 'bob@example.com'), (3, 'carol@example.com');
    INSERT INTO ${s}.tasks (owner_id, title, status, due_date) VALUES
      (1, '牛乳を買う', 'todo', '2026-11-18'),
      (1, '第64章を読む', 'doing', '2026-11-18'),
      (1, '終わったもの', 'done', '2026-11-18'),
      (1, '明日のもの', 'todo', '2026-11-19'),
      (2, 'レポートを出す', 'todo', '2026-11-18'),
      (3, '期限なし', 'todo', NULL);
  `);
}

function mailer(failFor: string[] = []) {
  const sent: Mail[] = [];
  return {
    sent,
    async send(mail: Mail) {
      if (failFor.includes(mail.to)) throw new Error('つながりません');
      sent.push(mail);
    },
  };
}

test('期限が今日で done でないタスクを持つ人に、1 通ずつ（ID の順に）', () =>
  withTestSchema(async (pool, s) => {
    await seed(pool, s);
    const m = mailer();
    assert.deepEqual(await sendDailyDigests(pool, s, m, '2026-11-18'), { sent: 2, skipped: 0, failed: 0 });
    assert.deepEqual(
      m.sent.map((x) => x.to),
      ['alice@example.com', 'bob@example.com'],
    );
  }));

test('件名と本文: 件名は「今日が期限のタスク（N 件）」、本文は題名を1行ずつ「- 題名」（タスクの ID の順）', () =>
  withTestSchema(async (pool, s) => {
    await seed(pool, s);
    const m = mailer();
    await sendDailyDigests(pool, s, m, '2026-11-18');
    assert.deepEqual(m.sent[0], {
      to: 'alice@example.com',
      subject: '今日が期限のタスク（2 件）',
      text: '- 牛乳を買う\n- 第64章を読む\n',
    });
  }));

test('同じ日に2回動いても、2通目は送らない（skipped）', () =>
  withTestSchema(async (pool, s) => {
    await seed(pool, s);
    const m = mailer();
    await sendDailyDigests(pool, s, m, '2026-11-18');
    assert.deepEqual(await sendDailyDigests(pool, s, m, '2026-11-18'), { sent: 0, skipped: 2, failed: 0 });
    assert.equal(m.sent.length, 2);
  }));

test('2つのワーカーが同時に動いても、1人1通', () =>
  withTestSchema(async (pool, s) => {
    await seed(pool, s);
    const m = mailer();
    const [a, b] = await Promise.all([
      sendDailyDigests(pool, s, m, '2026-11-18'),
      sendDailyDigests(pool, s, m, '2026-11-18'),
    ]);
    assert.equal(a.sent + b.sent, 2);
    assert.equal(a.skipped + b.skipped, 2);
    assert.equal(m.sent.length, 2);
  }));

test('1 人に送れなくても、ほかの人には送る。送れなかった人は、次に動いたとき送る', () =>
  withTestSchema(async (pool, s) => {
    await seed(pool, s);
    const broken = mailer(['alice@example.com']);
    assert.deepEqual(await sendDailyDigests(pool, s, broken, '2026-11-18'), { sent: 1, skipped: 0, failed: 1 });
    const fixed = mailer();
    assert.deepEqual(await sendDailyDigests(pool, s, fixed, '2026-11-18'), { sent: 1, skipped: 1, failed: 0 });
    assert.deepEqual(
      fixed.sent.map((x) => x.to),
      ['alice@example.com'],
    );
  }));

test('次の日は、また送る', () =>
  withTestSchema(async (pool, s) => {
    await seed(pool, s);
    const m = mailer();
    await sendDailyDigests(pool, s, m, '2026-11-18');
    assert.deepEqual(await sendDailyDigests(pool, s, m, '2026-11-19'), { sent: 1, skipped: 0, failed: 0 });
    assert.equal(m.sent.at(-1)?.text, '- 明日のもの\n');
  }));

test('型: tsc のエラーが無い', () => {
  assert.deepEqual(typeErrors([file]), []);
});
