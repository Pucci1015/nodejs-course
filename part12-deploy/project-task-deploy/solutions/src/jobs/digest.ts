// 追加（第12部）: 毎朝の「今日が期限のタスク」のお知らせ（第64章 練習問題8の daily-digest.ts から）
// 1 人 1 日 1 通だけ。ワーカーが 2 つ動いても、digest_log の行を先に入れたほうだけが送る
import type { Mailer } from '../auth/mailer.ts';
import type { Queryable } from '../db/pool.ts';

export type DigestResult = { sent: number; skipped: number; failed: number };

/** timeZone での、date の日付（YYYY-MM-DD）。en-CA は YYYY-MM-DD の形で書く（第46章 4.3節） */
export function dayIn(timeZone: string, date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export async function sendDailyDigests(
  db: Queryable,
  mailer: Mailer,
  day: string,
  appUrl: string,
): Promise<DigestResult> {
  // メールアドレスを確かめた人だけに送る
  const { rows } = await db.query<{ user_id: number; email: string; titles: string[] }>(
    `SELECT u.id AS user_id, u.email, array_agg(t.title ORDER BY t.id) AS titles
       FROM tasks t JOIN users u ON u.id = t.owner_id
      WHERE t.due_date = $1 AND t.status <> 'done' AND u.email IS NOT NULL AND u.email_verified_at IS NOT NULL
      GROUP BY u.id, u.email
      ORDER BY u.id`,
    [day],
  );
  const result: DigestResult = { sent: 0, skipped: 0, failed: 0 };
  for (const r of rows) {
    const claim = await db.query(
      'INSERT INTO digest_log (user_id, day) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING user_id',
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
        text: `${day} が期限のタスクです。\n\n${r.titles.map((t) => `- ${t}\n`).join('')}\n${appUrl}/\n`,
      });
      result.sent += 1;
    } catch {
      // 送れなかったら、行を消して、次に動いたときに送れるようにする
      await db.query('DELETE FROM digest_log WHERE user_id = $1 AND day = $2', [r.user_id, day]);
      result.failed += 1;
    }
  }
  return result;
}
