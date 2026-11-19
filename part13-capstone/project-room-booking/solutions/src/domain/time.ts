// 日本の時刻（Asia/Tokyo）と UTC の行き来（第67章 6.1節）
// データベースと API は、時刻をいつも UTC の瞬間（Date・ISO 8601）で持つ。「何日の何時」は、日本の時刻で数える
// 日本は夏時間が無いので、いつも UTC より 9 時間進んでいる。夏時間のある国なら、Intl で数える（第64章 6節）
const OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' の形で、本当にある日付か（2026-02-30 はだめ） */
export function isDateString(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m === null) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === s;
}

/** その瞬間の、日本での日付（'YYYY-MM-DD'）と、0 時からの分 */
export function tokyoParts(at: Date): { date: string; minutes: number } {
  const t = new Date(at.getTime() + OFFSET_MS); // UTC の読み方で読むと、日本の時刻になる
  return { date: t.toISOString().slice(0, 10), minutes: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

/** 日本での「date の 0 時から minutes 分」の瞬間 */
export function tokyoDateTime(date: string, minutes: number): Date {
  if (!isDateString(date)) throw new RangeError(`日付ではありません: ${date}`);
  return new Date(Date.parse(`${date}T00:00:00Z`) + minutes * 60_000 - OFFSET_MS);
}

/** date の n 日後（n が負なら前）の日付 */
export function addDays(date: string, n: number): string {
  return new Date(tokyoDateTime(date, 0).getTime() + OFFSET_MS + n * DAY_MS).toISOString().slice(0, 10);
}

/** 日本での、その日の 0 時から翌日の 0 時まで（to は含まない） */
export function dayRange(date: string): { from: Date; to: Date } {
  return { from: tokyoDateTime(date, 0), to: tokyoDateTime(addDays(date, 1), 0) };
}

/** 分を 'HH:MM' に（480 → '08:00'） */
export function hhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
