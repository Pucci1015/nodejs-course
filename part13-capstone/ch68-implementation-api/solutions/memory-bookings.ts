// 第68章 練習問題5 の模範解答: 予約のデータの層を、メモリで作る
// 重なりの判断は、PostgreSQL の EXCLUDE 制約と同じ条件（同じ会議室・取り消していない・[始まり, 終わり) が重なる）
import { ConflictError } from '../exercises/errors.ts';

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

/** 外に渡すときは写しを返す（Date も写す）。中のものを書き換えられないように（第11部 第57章の契約テストで見つけた落とし穴） */
const copy = (b: BookingRecord): BookingRecord => ({
  ...b,
  startsAt: new Date(b.startsAt),
  endsAt: new Date(b.endsAt),
  canceledAt: b.canceledAt === null ? null : new Date(b.canceledAt),
});

const byStart = (a: BookingRecord, b: BookingRecord) =>
  a.startsAt.getTime() - b.startsAt.getTime() || a.roomId - b.roomId || a.id - b.id;

export function createMemoryBookingRepo(rooms: Map<number, string>) {
  const items: BookingRecord[] = [];
  const active = () => items.filter((b) => b.canceledAt === null);

  return {
    async get(id: number): Promise<BookingRecord | null> {
      const b = items.find((x) => x.id === id);
      return b === undefined ? null : copy(b);
    },

    async listBetween(from: Date, to: Date): Promise<BookingRecord[]> {
      return active()
        .filter((b) => b.startsAt < to && b.endsAt > from)
        .toSorted(byStart)
        .map(copy);
    },

    async listUpcomingOf(userId: number, now: Date): Promise<BookingRecord[]> {
      return active()
        .filter((b) => b.userId === userId && b.endsAt > now)
        .toSorted(byStart)
        .map(copy);
    },

    async countUpcomingOf(userId: number, now: Date): Promise<number> {
      return active().filter((b) => b.userId === userId && b.endsAt > now).length;
    },

    async insert(b: { roomId: number; userId: number; title: string; startsAt: Date; endsAt: Date }): Promise<number> {
      const clash = active().some((x) => x.roomId === b.roomId && x.startsAt < b.endsAt && b.startsAt < x.endsAt);
      if (clash) throw new ConflictError('その時間は、ほかの予約と重なっています');
      const id = items.length + 1;
      items.push({
        id,
        roomId: b.roomId,
        roomName: rooms.get(b.roomId) ?? '',
        userId: b.userId,
        title: b.title,
        startsAt: new Date(b.startsAt),
        endsAt: new Date(b.endsAt),
        canceledAt: null,
      });
      return id;
    },

    async cancel(id: number, _by: number): Promise<boolean> {
      const b = items.find((x) => x.id === id);
      if (b === undefined || b.canceledAt !== null) return false;
      b.canceledAt = new Date();
      return true;
    },
  };
}
