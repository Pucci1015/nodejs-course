// 第67章 練習問題5 の模範解答: 1つの会議室の、その日の空いている時間
// 考え方: 営業時間を「まだ見ていない所の始まり（cursor）」で左から右へなめる。予約を早い順に見て、
// cursor より後ろで始まる予約があれば、cursor からその始まりまでが空き。見たら cursor を予約の終わりまで進める
import { RULES } from '../exercises/domain/booking-rules.ts';
import { hhmm, tokyoDateTime } from '../exercises/domain/time.ts';

export type Timed = { startsAt: Date; endsAt: Date };
export type FreeRange = { start: string; end: string };

export function freeRanges(date: string, bookings: Timed[]): FreeRange[] {
  const open = tokyoDateTime(date, RULES.openMinutes).getTime();
  const close = tokyoDateTime(date, RULES.closeMinutes).getTime();
  // 営業時間に切り詰め、営業時間に入らないもの（ほかの日など）は捨てる。toSorted は元の配列を変えない（第8部 第42章）
  const busy = bookings
    .map((b) => ({ s: Math.max(b.startsAt.getTime(), open), e: Math.min(b.endsAt.getTime(), close) }))
    .filter((b) => b.s < b.e)
    .toSorted((a, b) => a.s - b.s);

  const label = (t: number) => hhmm(RULES.openMinutes + (t - open) / 60_000);
  const out: FreeRange[] = [];
  let cursor = open;
  for (const b of busy) {
    if (b.s > cursor) out.push({ start: label(cursor), end: label(b.s) });
    cursor = Math.max(cursor, b.e); // 重なっている予約で、cursor を戻さない
  }
  if (cursor < close) out.push({ start: label(cursor), end: label(close) });
  return out;
}
