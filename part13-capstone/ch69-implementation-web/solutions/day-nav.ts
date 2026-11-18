// 第69章 練習問題3 の模範解答: その日の予約のページの日付と、前後の日
import { addDays, isDateString } from '../exercises/domain/time.ts';

export function pickDate(asked: string | null, today: string): string {
  return asked !== null && isDateString(asked) ? asked : today;
}

export function searchFor(date: string, today: string): Record<string, string> {
  return date === today ? {} : { date };
}

export function dayNav(date: string, today: string): { prev: string; next: string; isToday: boolean } {
  return { prev: addDays(date, -1), next: addDays(date, 1), isToday: date === today };
}
