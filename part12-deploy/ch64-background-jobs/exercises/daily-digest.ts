// 第64章 練習問題8: 毎朝の「今日が期限のタスク」のお知らせを、1 人 1 日 1 通だけ送る（本文 4・6節）
import type pg from 'pg';

export type Mailer = { send(mail: { to: string; subject: string; text: string }): Promise<void> };

export type DigestResult = { sent: number; skipped: number; failed: number };

/**
 * schema の中の users・tasks・digest_log を使う（表はテストが作る）。
 * day（YYYY-MM-DD）が期限で、done でないタスクを持つ人ごとに、1 通のメールを送る。
 */
export async function sendDailyDigests(pool: pg.Pool, schema: string, mailer: Mailer, day: string): Promise<DigestResult> {
  // ここを書く
  throw new Error(`まだ書いていません（${typeof pool} ${schema} ${typeof mailer} ${day}）`);
}
