// 第67章 練習問題6 の模範解答: minutes 分の予約を入れられる、いちばん早い始まり
// 枠は 1 日 26 個しかないので、8:00 から 30 分ずつ全部ためす（速さより、読みやすさと正しさ）
import { RULES } from '../exercises/domain/booking-rules.ts';
import { tokyoDateTime } from '../exercises/domain/time.ts';

export type Timed = { startsAt: Date; endsAt: Date };

export function findNextFree(date: string, bookings: Timed[], minutes: number, now: Date): Date | null {
  if (minutes % RULES.slotMinutes !== 0 || minutes < RULES.minMinutes || minutes > RULES.maxMinutes)
    throw new RangeError(`長さは 30 分〜3 時間の、30 分の区切りです: ${minutes}`);
  for (let m = RULES.openMinutes; m + minutes <= RULES.closeMinutes; m += RULES.slotMinutes) {
    const start = tokyoDateTime(date, m);
    const end = tokyoDateTime(date, m + minutes);
    if (start.getTime() <= now.getTime()) continue; // 過ぎた（ちょうど今も、過ぎたとする。checkBookingTime と同じ）
    // [start, end) と [b.startsAt, b.endsAt) が重なる ⇔ start < b.endsAt かつ b.startsAt < end（接するだけなら重ならない）
    const clash = bookings.some((b) => start < b.endsAt && b.startsAt < end);
    if (!clash) return start;
  }
  return null;
}
