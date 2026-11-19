// 第68章 練習問題1 の模範解答: データの層の予約を、API が返す形にする
// 出す項目を1つずつ書く。{ ...record } で広げてから消す書き方だと、データの層に項目が増えたとき、黙って API に出てしまう
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

export type Booking = {
  id: number;
  roomId: number;
  roomName: string;
  title: string;
  startsAt: string;
  endsAt: string;
  mine: boolean;
};

export function toBooking(record: BookingRecord, viewerId: number): Booking {
  return {
    id: record.id,
    roomId: record.roomId,
    roomName: record.roomName,
    title: record.title,
    startsAt: record.startsAt.toISOString(),
    endsAt: record.endsAt.toISOString(),
    mine: record.userId === viewerId,
  };
}
