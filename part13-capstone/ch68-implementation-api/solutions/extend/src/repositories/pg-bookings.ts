// 予約の、データの層（PostgreSQL）
// 重なり（23P01）は、データベースの制約 bookings_no_overlap が見つける（migrations/002_rooms_bookings.sql）
import type { Queryable } from '../db/pool.ts';
import { ConflictError } from '../errors.ts';

/** データの層の予約（だれの予約かを含む。API には userId を出さない） */
export type BookingRecord = {
  id: number;
  roomId: number;
  roomName: string;
  userId: number;
  title: string;
  startsAt: Date;
  endsAt: Date;
  canceledAt: Date | null;
};

type BookingRow = {
  id: number;
  room_id: number;
  room_name: string;
  user_id: number;
  title: string;
  starts_at: Date;
  ends_at: Date;
  canceled_at: Date | null;
};

const toBooking = (r: BookingRow): BookingRecord => ({
  id: r.id,
  roomId: r.room_id,
  roomName: r.room_name,
  userId: r.user_id,
  title: r.title,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  canceledAt: r.canceled_at,
});

// 会議室の名前も一緒に読む（自分の予約の一覧で、会議室の名前を出すため）
const SELECT = `
  SELECT b.id, b.room_id, r.name AS room_name, b.user_id, b.title, b.starts_at, b.ends_at, b.canceled_at
  FROM bookings b JOIN rooms r ON r.id = b.room_id`;

const isCode = (err: unknown, code: string) =>
  typeof err === 'object' && err !== null && 'code' in err && err.code === code;

export function createPgBookingRepo(db: Queryable) {
  return {
    async get(id: number): Promise<BookingRecord | null> {
      const { rows } = await db.query<BookingRow>(`${SELECT} WHERE b.id = $1`, [id]);
      return rows[0] === undefined ? null : toBooking(rows[0]);
    },

    /** from から to の間に重なる、取り消していない予約（始まりの順） */
    async listBetween(from: Date, to: Date): Promise<BookingRecord[]> {
      const { rows } = await db.query<BookingRow>(
        `${SELECT} WHERE b.canceled_at IS NULL AND b.starts_at < $2 AND b.ends_at > $1
         ORDER BY b.starts_at, b.room_id`,
        [from, to],
      );
      return rows.map(toBooking);
    },

    /** その人の、終わっていない・取り消していない予約（始まりの順） */
    async listUpcomingOf(userId: number, now: Date): Promise<BookingRecord[]> {
      const { rows } = await db.query<BookingRow>(
        `${SELECT} WHERE b.user_id = $1 AND b.canceled_at IS NULL AND b.ends_at > $2 ORDER BY b.starts_at, b.id`,
        [userId, now],
      );
      return rows.map(toBooking);
    },

    async countUpcomingOf(userId: number, now: Date): Promise<number> {
      const { rows } = await db.query<{ n: number }>(
        'SELECT count(*)::int AS n FROM bookings WHERE user_id = $1 AND canceled_at IS NULL AND ends_at > $2',
        [userId, now],
      );
      return rows[0]?.n ?? 0;
    },

    /** 予約を入れて、id を返す。時間が重なれば ConflictError */
    async insert(b: { roomId: number; userId: number; title: string; startsAt: Date; endsAt: Date }): Promise<number> {
      try {
        const { rows } = await db.query<{ id: number }>(
          'INSERT INTO bookings (room_id, user_id, title, starts_at, ends_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [b.roomId, b.userId, b.title, b.startsAt, b.endsAt],
        );
        const id = rows[0]?.id;
        if (id === undefined) throw new Error('INSERT が行を返しませんでした');
        return id;
      } catch (err) {
        if (isCode(err, '23P01')) throw new ConflictError('その時間は、ほかの予約と重なっています');
        throw err;
      }
    },

    // 追加（練習問題7）: 題名を変える。取り消してあれば変えずに false（確かめてから変えるまでの間に取り消されたとき）
    async updateTitle(id: number, title: string): Promise<boolean> {
      const { rowCount } = await db.query('UPDATE bookings SET title = $2 WHERE id = $1 AND canceled_at IS NULL', [
        id,
        title,
      ]);
      return rowCount === 1;
    },

    /** 取り消す。もう取り消してあれば false（2人が同時に取り消したとき、片方だけが true） */
    async cancel(id: number, by: number): Promise<boolean> {
      const { rowCount } = await db.query(
        'UPDATE bookings SET canceled_at = now(), canceled_by = $2 WHERE id = $1 AND canceled_at IS NULL',
        [id, by],
      );
      return rowCount === 1;
    },
  };
}

export type BookingRepo = ReturnType<typeof createPgBookingRepo>;
