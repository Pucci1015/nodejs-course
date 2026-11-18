// 第68章 練習問題1: データの層の予約（BookingRecord）を、API が返す形にする（本文 5.2節）

/** データの層の予約（だれの予約か userId を持つ） */
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

/** API が返す予約。userId・canceledAt は出さない。時刻は ISO 8601 の文字列。自分の予約か（mine）を出す */
export type Booking = {
  id: number;
  roomId: number;
  roomName: string;
  title: string;
  startsAt: string;
  endsAt: string;
  mine: boolean;
};

/** viewerId（見ている人の id）から見た、API の形 */
export function toBooking(record: BookingRecord, viewerId: number): Booking {
  // ここを書く
  throw new Error(`まだ書いていません（${record.id} ${viewerId}）`);
}
