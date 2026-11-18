// 第64章 練習問題3: 「毎日 何時何分（その地域の時刻）」の、次の時刻を求める（本文 6節）

export type DailyAt = {
  hour: number; // 0〜23
  minute: number; // 0〜59
  /** UTC からのずれ（分）。日本は +540（夏時間が無いので、いつも同じ） */
  utcOffsetMinutes: number;
};

/** now より後（同じ時刻はふくまない）で、いちばん近い「その地域の hour:minute」を返す */
export function nextDailyRun(now: Date, at: DailyAt): Date {
  // ここを書く
  throw new Error(`まだ書いていません（${now.toISOString()} ${typeof at}）`);
}

/** その時刻が、その地域で何日か（YYYY-MM-DD）。毎日の仕事の「1 日 1 回」のキーに使う */
export function localDay(time: Date, utcOffsetMinutes: number): string {
  // ここを書く
  throw new Error(`まだ書いていません（${time.toISOString()} ${utcOffsetMinutes}）`);
}
