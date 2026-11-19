// 第69章 練習問題1 の模範解答: 予約のダイアログの「長さ」の選択肢
import { RULES } from '../exercises/domain/booking-rules.ts';
import { hhmm } from '../exercises/domain/time.ts';

export function lengthsFrom(startMinutes: number): number[] {
  const out: number[] = [];
  for (
    let m = RULES.minMinutes;
    m <= RULES.maxMinutes && startMinutes + m <= RULES.closeMinutes;
    m += RULES.slotMinutes
  )
    out.push(m);
  return out;
}

export function lengthLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} 分`;
  if (m === 0) return `${h} 時間`;
  return `${h} 時間 ${m} 分`;
}

export function optionLabel(startMinutes: number, minutes: number): string {
  return `${lengthLabel(minutes)}（〜${hhmm(startMinutes + minutes)}）`;
}
