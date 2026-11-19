// 第68章 練習問題8 の模範解答: 会議室ごとの、その日の使われ方
import type pg from 'pg';
import { dayRange } from '../exercises/domain/time.ts';

export type UsageRow = { roomId: number; roomName: string; count: number; minutes: number };

type Row = { room_id: number; room_name: string; count: number; minutes: number };

export async function usageReport(db: pg.ClientBase, date: string): Promise<UsageRow[]> {
  const { from, to } = dayRange(date);
  // 予約の条件は ON に書く。WHERE に書くと、予約の無い会議室の行（b の列が NULL）が消える（第30章 2節）
  // count(b.id) は NULL を数えないので、予約が無ければ 0。sum は行が無いと NULL なので coalesce で 0 に
  // ::int で整数にする（pg は count の bigint と、計算した numeric を文字列で返すため。第32章 4節）
  const { rows } = await db.query<Row>(
    `SELECT r.id AS room_id, r.name AS room_name,
            count(b.id)::int AS count,
            coalesce(sum(extract(epoch FROM b.ends_at - b.starts_at) / 60), 0)::int AS minutes
     FROM rooms r
     LEFT JOIN bookings b
       ON b.room_id = r.id AND b.canceled_at IS NULL AND b.starts_at < $2 AND b.ends_at > $1
     WHERE r.active
     GROUP BY r.id, r.name
     ORDER BY r.id`,
    [from, to],
  );
  return rows.map((r) => ({ roomId: r.room_id, roomName: r.room_name, count: r.count, minutes: r.minutes }));
}
