// 練習問題2: 「今」を引数で受け取る形に直し、新しい決まりを足す
// 今は、関数の中で new Date() を読んでいるので、テストで「今日」を決められません

const DAY_MS = 24 * 60 * 60 * 1000;

// ここを書く（引数に now: Date を足し、問題文の表の決まりにする）
export function dueLabel(due: string | null): string {
  if (due === null) return '期限なし';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date());
  const days = (Date.parse(due) - Date.parse(today)) / DAY_MS;
  if (days === 0) return '今日まで';
  return days > 0 ? `あと ${days} 日` : `${-days} 日過ぎ`;
}
