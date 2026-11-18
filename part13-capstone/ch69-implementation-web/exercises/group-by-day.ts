// 第69章 練習問題6: 予約を日本の日付ごとにまとめる（本文 4.3節の Map.groupBy・5.1節）
import { tokyoParts } from './domain/time.ts';

export type DayGroup<T> = { date: string; items: T[] };

/**
 * 予約（時刻は ISO 8601 の文字列）を、始まりの日本の日付ごとにまとめる
 * - 日付の早い順。同じ日の中は、始まりの早い順（同じなら元の並びの順）
 * - 引数の配列を並べ替えない
 */
export function groupByDay<T extends { startsAt: string }>(bookings: readonly T[]): DayGroup<T>[] {
  // ここを書く
  void tokyoParts;
  throw new Error(`まだ書いていません（${bookings.length}）`);
}
