// 第69章 練習問題3: その日の予約のページの日付と、前後の日（本文 3.2節）
import { addDays, isDateString } from './domain/time.ts';

/** URL の ?date= の値（無ければ null）から、表示する日付。無い・正しくなければ today */
export function pickDate(asked: string | null, today: string): string {
  // ここを書く
  void isDateString;
  throw new Error(`まだ書いていません（${asked} ${today}）`);
}

/** その日に移るときの、URL のクエリ（setSearchParams に渡すもの）。今日なら ?date= を書かない */
export function searchFor(date: string, today: string): Record<string, string> {
  // ここを書く
  throw new Error(`まだ書いていません（${date} ${today}）`);
}

/** 「前の日」「次の日」のボタンで移る日付と、「今日」のボタンを押せないか（今日を表示している） */
export function dayNav(date: string, today: string): { prev: string; next: string; isToday: boolean } {
  // ここを書く
  void addDays;
  throw new Error(`まだ書いていません（${date} ${today}）`);
}
