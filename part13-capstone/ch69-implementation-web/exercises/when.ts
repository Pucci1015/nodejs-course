// 第69章 練習問題2: 自分の予約の1行の「いつ・どこ」（本文 2.1節・5.1節）
import { hhmm, tokyoParts } from './domain/time.ts';

/** '2026-12-10' → '12/10（木）'。月と日の頭に 0 を付けない */
export function formatDay(date: string): string {
  // ここを書く
  throw new Error(`まだ書いていません（${date}）`);
}

/** API の予約（時刻は ISO 8601 の文字列）→ '12/10（木） 10:00〜11:00 会議室A'（日本の時刻） */
export function when(b: { startsAt: string; endsAt: string; roomName: string }): string {
  // ここを書く
  void [hhmm, tokyoParts];
  throw new Error(`まだ書いていません（${b.roomName}）`);
}
