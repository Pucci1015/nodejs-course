// 第67章 練習問題8 の模範解答: 毎週の予約を、1回ずつの予約に広げて、それぞれを決まりで確かめる
// 入力の「形」の間違い（日付でない・'HH:MM' でない）は、呼んだ側の間違いなので例外。
// 形は正しいが「決まり」に合わない回（60 日より先など）は、回ごとに issues で返す（画面が「この回は入れられません」と出せるように）
import { checkBookingTime } from '../exercises/domain/booking-rules.ts';
import { addDays, isDateString, tokyoDateTime } from '../exercises/domain/time.ts';

export type WeeklyInput = { date: string; start: string; minutes: number; weeks: number };
export type Occurrence = { date: string; startsAt: Date; endsAt: Date; issues: string[] };

/** 'HH:MM' を 0 時からの分に。形が違えば RangeError */
function parseHhmm(s: string): number {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s);
  if (m === null) throw new RangeError(`'HH:MM' の時刻ではありません: ${s}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

export function expandWeekly(input: WeeklyInput, now: Date): Occurrence[] {
  if (!isDateString(input.date)) throw new RangeError(`日付ではありません: ${input.date}`);
  if (!Number.isInteger(input.weeks) || input.weeks < 1 || input.weeks > 12)
    throw new RangeError(`回数は 1〜12 です: ${input.weeks}`);
  const startMinutes = parseHhmm(input.start);

  return Array.from({ length: input.weeks }, (_, i) => {
    const date = addDays(input.date, i * 7);
    const startsAt = tokyoDateTime(date, startMinutes);
    const endsAt = tokyoDateTime(date, startMinutes + input.minutes);
    const issues = checkBookingTime(startsAt, endsAt, now).map((x) => x.message);
    return { date, startsAt, endsAt, issues };
  });
}
