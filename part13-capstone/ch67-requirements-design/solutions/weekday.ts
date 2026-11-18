// 第67章 練習問題2 の模範解答: 日付の曜日と、週末か
// 日付だけの文字は「どこの 0 時か」を持たないので、UTC の 0 時として読み、UTC の曜日を使う（第8部 第46章 4.3節）
import { isDateString } from '../exercises/domain/time.ts';

export type Weekday = '日' | '月' | '火' | '水' | '木' | '金' | '土';
const WEEKDAYS: readonly Weekday[] = ['日', '月', '火', '水', '木', '金', '土'];

export function weekdayOf(date: string): Weekday {
  if (!isDateString(date)) throw new RangeError(`日付ではありません: ${date}`);
  const day = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  if (day === undefined) throw new Error('ここには来ない'); // getUTCDay は 0〜6
  return day;
}

export function isWeekend(date: string): boolean {
  const w = weekdayOf(date);
  return w === '土' || w === '日';
}
