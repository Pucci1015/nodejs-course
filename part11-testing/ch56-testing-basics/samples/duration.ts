// 第56章 1節: テストする関数。作業の時間の書き方（"90"・"45m"・"2h"・"1h30m"）を、分の数にする
// 読めない書き方や、範囲（1分〜24時間）の外なら null

const MAX_MINUTES = 24 * 60;

function inRange(minutes: number): number | null {
  return minutes >= 1 && minutes <= MAX_MINUTES ? minutes : null;
}

export function parseDuration(text: string): number | null {
  const s = text.trim();
  // 数字だけなら、分
  if (/^\d+$/.test(s)) return inRange(Number(s));
  // 「時間」と「分」は、どちらか片方だけでもよい
  const match = /^(?:(\d+)h)?(?:(\d+)m)?$/.exec(s);
  if (match === null) return null;
  const [, hours, minutes] = match;
  if (hours === undefined && minutes === undefined) return null; // 空の文字列
  return inRange(Number(hours ?? 0) * 60 + Number(minutes ?? 0));
}
