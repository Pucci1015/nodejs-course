// 練習問題2 の模範解答: 「今」を引数で受け取る

const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_ZONE = 'Asia/Tokyo';

// 修正: now を引数で受け取る
export function dueLabel(due: string | null, now: Date): string {
  if (due === null) return '期限なし';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now);
  const days = (Date.parse(due) - Date.parse(today)) / DAY_MS;
  if (days < 0) return `${-days} 日過ぎ`;
  if (days === 0) return '今日まで';
  // 追加: 明日、1週間より先
  if (days === 1) return '明日まで';
  if (days < 7) return `あと ${days} 日`;
  // 'YYYY-MM-DD' の月と日を、数として読む（先頭の 0 を消すため）
  const [, month, day] = due.split('-').map(Number);
  return `${month}月${day}日まで`;
}
