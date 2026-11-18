// 第56章 5節: 「今」を引数で受け取る形。テストで好きな日を渡せる

const DAY_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' の期限まで、now の日（timeZone の地域の日付）から何日か。過ぎていれば負の数 */
export function daysUntil(due: string, now: Date, timeZone = 'Asia/Tokyo'): number {
  // en-CA の形は YYYY-MM-DD（第8部 第46章 4.3節）
  const today = new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
  // どちらも「その日の 0 時（UTC）」として引くので、ちょうど日数の倍になる
  return (Date.parse(due) - Date.parse(today)) / DAY_MS;
}

export function dueLabel(due: string | null, now: Date): string {
  if (due === null) return '期限なし';
  const days = daysUntil(due, now);
  if (days === 0) return '今日まで';
  return days > 0 ? `あと ${days} 日` : `${-days} 日過ぎ`;
}
