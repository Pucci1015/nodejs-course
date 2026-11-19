// 日付の表示（第46章 4.3節）。日付だけの文字は Date にせず、文字のまま数える

/** その時刻の、そのタイムゾーンでの日付（'YYYY-MM-DD'） */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** ISO 8601 の日時を、日本の時刻で出す */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'medium', timeStyle: 'short' });
}
