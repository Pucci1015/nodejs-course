// 前日のリマインド（第69章 4節）。毎日 18:00（日本の時刻）に、翌日の予約がある人へ1通ずつ送る
// 2回動いても困らないように（第64章 4節）、reminder_log に行を入れられた人にだけ送る。
// 送れなかったら、その人の行も入れない（トランザクションを戻す）。再試行で、まだの人にだけ送る
import type pg from 'pg';
import type { Mailer } from '../auth/mailer.ts';
import { addDays, dayRange, tokyoParts } from '../domain/time.ts';
import { reminderMail } from '../services/booking-mails.ts';

type Row = { user_id: number; email: string; room_name: string; title: string; starts_at: Date; ends_at: Date };

/** 今（日本の時刻）の、次の日 */
export const tomorrowOf = (now: Date) => addDays(tokyoParts(now).date, 1);

/** day（日本の日付）の予約がある人に、リマインドを送る。送った人数と、もう送ってあった人数を返す */
export async function sendReminders(
  pool: pg.Pool,
  mailer: Mailer,
  day: string,
  appUrl: string,
): Promise<{ sent: number; skipped: number }> {
  const { from, to } = dayRange(day);
  const { rows } = await pool.query<Row>(
    `SELECT b.user_id, u.email, r.name AS room_name, b.title, b.starts_at, b.ends_at
     FROM bookings b JOIN users u ON u.id = b.user_id JOIN rooms r ON r.id = b.room_id
     WHERE b.canceled_at IS NULL AND b.starts_at >= $1 AND b.starts_at < $2 AND u.email IS NOT NULL
     ORDER BY b.user_id, b.starts_at`,
    [from, to],
  );
  // 人ごとにまとめる
  const byUser = Map.groupBy(rows, (r) => r.user_id);
  let sent = 0;
  let skipped = 0;
  for (const [userId, list] of byUser) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query('INSERT INTO reminder_log (user_id, day) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
        userId,
        day,
      ]);
      if (r.rowCount === 0) {
        skipped++; // もう送ってある（ほかのワーカーか、前の回）
        await client.query('ROLLBACK');
        continue;
      }
      const first = list[0];
      if (first === undefined) throw new Error('予約がありません');
      const bookings = list.map((b) => ({
        roomName: b.room_name,
        title: b.title,
        startsAt: b.starts_at,
        endsAt: b.ends_at,
      }));
      await mailer.send(reminderMail(first.email, day, bookings, appUrl));
      await client.query('COMMIT'); // 送れてから、記録を確定する
      sent++;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err; // BullMQ が待ってから再試行する。送れた人の分は記録が残っているので、2通目は送らない
    } finally {
      client.release();
    }
  }
  return { sent, skipped };
}
