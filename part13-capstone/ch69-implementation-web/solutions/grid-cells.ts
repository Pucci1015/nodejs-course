// 第69章 練習問題5 の模範解答: 表の1つの列の、セルの作り方
import type { Slot } from '../exercises/domain/slots.ts';

export type Cell<T> =
  { kind: 'booked'; booking: T; span: number } | { kind: 'covered' } | { kind: 'past' } | { kind: 'free' };

export function gridCells<T>(slots: Slot[], busy: (T | null)[], now: Date): Cell<T>[] {
  return slots.map((slot, i): Cell<T> => {
    const booking = busy[i] ?? null;
    if (booking === null) return slot.start.getTime() <= now.getTime() ? { kind: 'past' } : { kind: 'free' };
    if (i > 0 && busy[i - 1] === booking) return { kind: 'covered' };
    let span = 1;
    while (busy[i + span] === booking) span++;
    return { kind: 'booked', booking, span };
  });
}
