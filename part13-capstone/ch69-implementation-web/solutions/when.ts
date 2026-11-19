// 第69章 練習問題2 の模範解答: 自分の予約の1行の「いつ・どこ」
import { hhmm, tokyoParts } from '../exercises/domain/time.ts';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function formatDay(date: string): string {
  // 日付だけの文字は「どこの 0 時か」を持たないので、UTC の 0 時として読み、UTC の読み方で読む（第67章 練習問題2）
  const d = new Date(`${date}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}（${WEEKDAYS[d.getUTCDay()] ?? ''}）`;
}

export function when(b: { startsAt: string; endsAt: string; roomName: string }): string {
  const s = tokyoParts(new Date(b.startsAt));
  const e = tokyoParts(new Date(b.endsAt));
  return `${formatDay(s.date)} ${hhmm(s.minutes)}〜${hhmm(e.minutes)} ${b.roomName}`;
}
