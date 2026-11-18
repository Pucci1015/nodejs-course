// 第67章 練習問題2: 日付の曜日と、週末か（本文 5節。画面の「12/10（木）」の材料）

export type Weekday = '日' | '月' | '火' | '水' | '木' | '金' | '土';

/** 'YYYY-MM-DD' の曜日。日付でなければ RangeError */
export function weekdayOf(date: string): Weekday {
  // ここを書く
  throw new Error(`まだ書いていません（${date}）`);
}

/** 土曜か日曜か */
export function isWeekend(date: string): boolean {
  // ここを書く
  throw new Error(`まだ書いていません（${date}）`);
}
