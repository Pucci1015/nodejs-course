// 第67章 練習問題6: 1つの会議室で、minutes 分の予約を入れられる、いちばん早い始まり（本文 5・6節）
// 使ってよいもの: ./domain/time.ts、./domain/booking-rules.ts
import { RULES } from './domain/booking-rules.ts';
import { tokyoDateTime } from './domain/time.ts';

export type Timed = { startsAt: Date; endsAt: Date };

/**
 * date（日本の日付）の中で、次の全部に合う、いちばん早い始まりを返す。無ければ null
 * - 始まりは 30 分の区切り（8:00、8:30、…）で、now より後
 * - 終わり（始まり + minutes）は 21:00 まで
 * - bookings のどれとも重ならない（接するのはよい）
 * minutes が 30 の倍数でない・30 分〜3 時間でなければ RangeError
 */
export function findNextFree(date: string, bookings: Timed[], minutes: number, now: Date): Date | null {
  // ここを書く
  void [RULES, tokyoDateTime];
  throw new Error(`まだ書いていません（${date} ${bookings.length} ${minutes} ${now.toISOString()}）`);
}
