// 第67章 練習問題1 の模範解答: 時刻を 30 分の区切りに切り下げる・切り上げる
// 日本は UTC との差が 9 時間ちょうどなので、UTC の 30 分の区切りは、日本でも 30 分の区切り（booking-rules.ts の onGrid と同じ考え）
const SLOT_MS = 30 * 60_000;

export function floorToSlot(at: Date): Date {
  return new Date(Math.floor(at.getTime() / SLOT_MS) * SLOT_MS);
}

export function ceilToSlot(at: Date): Date {
  return new Date(Math.ceil(at.getTime() / SLOT_MS) * SLOT_MS);
}
