// 第67章 練習問題8: 毎週の予約を、1回ずつの予約に広げて、それぞれを決まりで確かめる（本文 5節。振り返りの Try の1つ）
// 使ってよいもの: ./domain/time.ts、./domain/booking-rules.ts（checkBookingTime）
import { checkBookingTime } from './domain/booking-rules.ts';
import { addDays, tokyoDateTime } from './domain/time.ts';

export type WeeklyInput = {
  /** 最初の回の日付（日本の日付 'YYYY-MM-DD'） */
  date: string;
  /** 始まりの時刻（'HH:MM'、日本の時刻） */
  start: string;
  /** 長さ（分） */
  minutes: number;
  /** 何回か（1〜12） */
  weeks: number;
};

export type Occurrence = {
  date: string;
  startsAt: Date;
  endsAt: Date;
  /** 決まりに合わないところ（checkBookingTime の message）。合えば空 */
  issues: string[];
};

/**
 * 毎週同じ曜日・同じ時刻の予約を、weeks 回に広げる
 * - 入力の形が正しくなければ（日付でない・'HH:MM' でない・weeks が 1〜12 の整数でない）RangeError
 * - 1回ずつ checkBookingTime で確かめ、合わないところを issues に入れる（入力の形は正しいが、決まりに合わない回もある）
 */
export function expandWeekly(input: WeeklyInput, now: Date): Occurrence[] {
  // ここを書く
  void [checkBookingTime, addDays, tokyoDateTime];
  throw new Error(`まだ書いていません（${input.date} ${now.toISOString()}）`);
}
