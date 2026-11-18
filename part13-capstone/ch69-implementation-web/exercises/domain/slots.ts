// 本文で書いた src/domain/slots.ts のコピー（練習問題で使う。書き換えなくてよいファイル）
// 1日の枠（8:00〜21:00 を 30 分ずつ）と、予約で埋まった枠（第67章 6.3節。画面の表で使う）
import { RULES } from './booking-rules.ts';
import { hhmm, tokyoDateTime } from './time.ts';

export type Slot = { start: Date; end: Date; label: string };

/** その日の枠を、早い順に全部（8:00〜21:00 なら 26 個） */
export function slotsOfDay(date: string): Slot[] {
  const slots: Slot[] = [];
  for (let m = RULES.openMinutes; m < RULES.closeMinutes; m += RULES.slotMinutes) {
    slots.push({ start: tokyoDateTime(date, m), end: tokyoDateTime(date, m + RULES.slotMinutes), label: hhmm(m) });
  }
  return slots;
}

/** 時刻を持つもの（予約）。API の応答のように、ISO 8601 の文字列でもよい */
export type Timed = { startsAt: Date | string; endsAt: Date | string };

/** 枠ごとに、その枠に重なる予約（無ければ null）。同じ枠に重なる予約は、1つしか無いはず（DB の制約） */
export function markBusy<T extends Timed>(slots: Slot[], bookings: T[]): (T | null)[] {
  return slots.map(
    (slot) =>
      bookings.find(
        (b) =>
          new Date(b.startsAt).getTime() < slot.end.getTime() && slot.start.getTime() < new Date(b.endsAt).getTime(),
      ) ?? null,
  );
}
