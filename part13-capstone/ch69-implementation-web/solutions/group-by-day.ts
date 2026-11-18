// 第69章 練習問題6 の模範解答: 予約を日本の日付ごとにまとめる
import { tokyoParts } from '../exercises/domain/time.ts';

export type DayGroup<T> = { date: string; items: T[] };

export function groupByDay<T extends { startsAt: string }>(bookings: readonly T[]): DayGroup<T>[] {
  // 先に始まりの順に並べてから分けると、どの日の中も早い順になる（toSorted は元の配列を変えない）
  const sorted = bookings.toSorted((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const byDay = Map.groupBy(sorted, (x) => tokyoParts(new Date(x.startsAt)).date);
  // Map は入れた順に回る。並べた後に分けたので、日付も早い順になっている
  return [...byDay].map(([date, items]) => ({ date, items }));
}
