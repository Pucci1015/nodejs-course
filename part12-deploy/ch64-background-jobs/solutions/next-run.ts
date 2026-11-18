// 第64章 練習問題3: 「毎日 何時何分（その地域の時刻）」の、次の時刻を求める（本文 6節）

export type DailyAt = {
  hour: number; // 0〜23
  minute: number; // 0〜59
  /** UTC からのずれ（分）。日本は +540（夏時間が無いので、いつも同じ） */
  utcOffsetMinutes: number;
};

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** now より後（同じ時刻はふくまない）で、いちばん近い「その地域の hour:minute」を返す */
export function nextDailyRun(now: Date, at: DailyAt): Date {
  if (!Number.isInteger(at.hour) || at.hour < 0 || at.hour > 23) throw new Error(`hour は 0〜23 です: ${at.hour}`);
  if (!Number.isInteger(at.minute) || at.minute < 0 || at.minute > 59) throw new Error(`minute は 0〜59 です: ${at.minute}`);
  const offset = at.utcOffsetMinutes * MINUTE;
  // 1. その地域の時刻を「UTC の時刻のふり」をした数にする（ずれを足す）
  const local = now.getTime() + offset;
  // 2. その地域の「今日の 0:00」と「今日の hour:minute」
  const startOfDay = Math.floor(local / DAY) * DAY;
  let run = startOfDay + (at.hour * 60 + at.minute) * MINUTE;
  // 3. もう過ぎていたら（同じ時刻も）、次の日
  if (run <= local) run += DAY;
  // 4. ずれを引いて、本当の UTC の時刻に戻す
  return new Date(run - offset);
}

/** その時刻が、その地域で何日か（YYYY-MM-DD）。毎日の仕事の「1 日 1 回」のキーに使う */
export function localDay(time: Date, utcOffsetMinutes: number): string {
  return new Date(time.getTime() + utcOffsetMinutes * MINUTE).toISOString().slice(0, 10);
}
