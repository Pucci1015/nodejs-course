// 第68章 練習問題5: 予約のデータの層を、メモリで作る（本文 4.2節の createPgBookingRepo と同じ形）
// サービスの単体テストで、PostgreSQL の代わりに使える（第11部 第57章の偽物のリポジトリ）
import { ConflictError } from './errors.ts';

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

/** rooms: 会議室の id → 名前（roomName を埋めるため） */
export function createMemoryBookingRepo(rooms: Map<number, string>) {
  // ここに、予約を入れておく入れ物を作る
  void [rooms, ConflictError];
  return {
    async get(id: number): Promise<BookingRecord | null> {
      throw new Error(`まだ書いていません（${id}）`);
    },
    /** from から to の間に重なる、取り消していない予約（始まりの順、同じなら会議室の順） */
    async listBetween(from: Date, to: Date): Promise<BookingRecord[]> {
      throw new Error(`まだ書いていません（${from.toISOString()} ${to.toISOString()}）`);
    },
    /** その人の、終わっていない・取り消していない予約（始まりの順） */
    async listUpcomingOf(userId: number, now: Date): Promise<BookingRecord[]> {
      throw new Error(`まだ書いていません（${userId} ${now.toISOString()}）`);
    },
    async countUpcomingOf(userId: number, now: Date): Promise<number> {
      throw new Error(`まだ書いていません（${userId} ${now.toISOString()}）`);
    },
    /** 予約を入れて id（1 から順に）を返す。同じ会議室の取り消していない予約と重なれば ConflictError */
    async insert(b: { roomId: number; userId: number; title: string; startsAt: Date; endsAt: Date }): Promise<number> {
      throw new Error(`まだ書いていません（${b.title}）`);
    },
    /** 取り消す。無い・もう取り消してあれば false */
    async cancel(id: number, by: number): Promise<boolean> {
      throw new Error(`まだ書いていません（${id} ${by}）`);
    },
  };
}
