// 第67章 練習問題5: 1つの会議室の、その日の空いている時間（本文 5・6節）
// 使ってよいもの: ./domain/time.ts（tokyoDateTime・tokyoParts・hhmm）、./domain/booking-rules.ts（RULES）
import { RULES } from './domain/booking-rules.ts';
import { hhmm, tokyoDateTime, tokyoParts } from './domain/time.ts';

export type Timed = { startsAt: Date; endsAt: Date };
/** 空いている時間。'HH:MM'（日本の時刻） */
export type FreeRange = { start: string; end: string };

/**
 * date（日本の日付）の 8:00〜21:00 のうち、bookings のどれとも重ならない時間を、早い順に返す
 * bookings は早い順とは限らない。営業時間の外にはみ出していることもある（その部分は無視する）
 */
export function freeRanges(date: string, bookings: Timed[]): FreeRange[] {
  // ここを書く
  void [RULES, hhmm, tokyoDateTime, tokyoParts];
  throw new Error(`まだ書いていません（${date} ${bookings.length}）`);
}
