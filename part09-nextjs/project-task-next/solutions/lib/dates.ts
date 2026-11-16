// 日付の表示（第8部の成果物と同じ。第46章 4.3節）。日付だけの文字は Date にせず、文字のまま数える

/** その時刻の、そのタイムゾーンでの日付（'YYYY-MM-DD'） */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export type DueInfo = { label: string; overdue: boolean };

export function dueInfo(dueDate: string | null, today: string): DueInfo | null {
  if (dueDate === null) return null;
  const diff = dayNumber(dueDate) - dayNumber(today);
  if (diff === 0) return { label: '今日まで', overdue: false };
  if (diff === 1) return { label: '明日まで', overdue: false };
  if (diff > 1) return { label: `あと ${diff} 日`, overdue: false };
  return { label: `${-diff} 日過ぎています`, overdue: true };
}

/** ISO 8601 の日時を、日本の時刻で出す */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'medium', timeStyle: 'short' });
}
