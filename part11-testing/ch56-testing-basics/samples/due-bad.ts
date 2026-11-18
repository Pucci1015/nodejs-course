// 第56章 5節: テストしにくい形。関数の中で「今」を読んでいる
// （due.ts と比べるためのファイル）

const DAY_MS = 24 * 60 * 60 * 1000;

export function dueLabel(due: string | null): string {
  if (due === null) return '期限なし';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date()); // ← いつ動かすかで結果が変わる
  const days = (Date.parse(due) - Date.parse(today)) / DAY_MS;
  if (days === 0) return '今日まで';
  return days > 0 ? `あと ${days} 日` : `${-days} 日過ぎ`;
}
