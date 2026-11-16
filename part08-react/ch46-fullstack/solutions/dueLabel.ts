// 第46章 練習問題7の模範解答

/** その時刻の、そのタイムゾーンでの日付（'YYYY-MM-DD'） */
export function todayIn(timeZone: string, now: Date): string {
  // en-CA の書き方は YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

// 'YYYY-MM-DD' を、1970-01-01 から数えた日数にする（UTC で数えるので、時差の影響を受けない）
function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function dueLabel(dueDate: string | null, today: string): string {
  if (dueDate === null) return '締め切りなし';
  const diff = dayNumber(dueDate) - dayNumber(today);
  if (diff === 0) return '今日まで';
  if (diff === 1) return '明日まで';
  if (diff > 1) return `あと ${diff} 日`;
  return `${-diff} 日過ぎています`;
}
