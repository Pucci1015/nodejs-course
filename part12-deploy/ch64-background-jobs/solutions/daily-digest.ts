// 第64章 練習問題8: 毎朝の「今日が期限のタスク」のお知らせを、1 人 1 日 1 通だけ送る（本文 4・6節）
import type pg from 'pg';

export type Mailer = { send(mail: { to: string; subject: string; text: string }): Promise<void> };

export type DigestResult = { sent: number; skipped: number; failed: number };

/**
 * schema の中の users・tasks・digest_log を使う（表はテストが作る）。
 * day（YYYY-MM-DD）が期限で、done でないタスクを持つ人ごとに、1 通のメールを送る。
 */
export async function sendDailyDigests(pool: pg.Pool, schema: string, mailer: Mailer, day: string): Promise<DigestResult> {
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error(`schema の名前が正しくありません: ${schema}`);
  // 1. 送る相手と、その人のタスクの題名（ID の順）を、1 つの SQL で集める
  const { rows } = await pool.query<{ user_id: string; email: string; titles: string[] }>(
    `SELECT u.id AS user_id, u.email, array_agg(t.title ORDER BY t.id) AS titles
       FROM ${schema}.tasks t JOIN ${schema}.users u ON u.id = t.owner_id
      WHERE t.due_date = $1 AND t.status <> 'done'
      GROUP BY u.id, u.email
      ORDER BY u.id`,
    [day],
  );

  const result: DigestResult = { sent: 0, skipped: 0, failed: 0 };
  for (const r of rows) {
    // 2. 「この人の、この日」の行を先に入れる。入れられた（RETURNING が 1 行）ワーカーだけが送る
    const claim = await pool.query(
      `INSERT INTO ${schema}.digest_log (user_id, day) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING user_id`,
      [r.user_id, day],
    );
    if (claim.rowCount === 0) {
      result.skipped += 1;
      continue;
    }
    try {
      await mailer.send({
        to: r.email,
        subject: `今日が期限のタスク（${r.titles.length} 件）`,
        text: r.titles.map((t) => `- ${t}\n`).join(''),
      });
      result.sent += 1;
    } catch {
      // 3. 送れなかったら、行を消して、次に動いたときに送れるようにする
      await pool.query(`DELETE FROM ${schema}.digest_log WHERE user_id = $1 AND day = $2`, [r.user_id, day]);
      result.failed += 1;
    }
  }
  return result;
}
