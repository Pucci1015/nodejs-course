// 「今」の時刻（第69章 2節）。描画の中で new Date() を呼ばず、state に持って1分ごとに進める
// 描画は同じ props と state なら同じ結果になるはずなので、毎回変わる値は state から読む（第42章 1節）
import { useEffect, useState } from 'react';

export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** '2026-12-10' → '12/10（木）'。日付だけの文字なので、UTC の 0 時として曜日を数える（第46章 4.3節） */
export function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}（${WEEKDAYS[d.getUTCDay()] ?? ''}）`;
}
