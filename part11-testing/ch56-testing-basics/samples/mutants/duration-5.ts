// ミュータント: 小数の時間も読む（1.5h → 90）

const MAX_MINUTES = 24 * 60;

function inRange(minutes: number): number | null {
  return minutes >= 1 && minutes <= MAX_MINUTES ? minutes : null;
}

export function parseDuration(text: string): number | null {
  const s = text.trim();
  // 数字だけなら、分
  if (/^\d+$/.test(s)) return inRange(Number(s));
  // 「時間」と「分」は、どちらか片方だけでもよい
  const match = /^(?:(\d+(?:\.\d+)?)h)?(?:(\d+)m)?$/.exec(s);
  if (match === null) return null;
  const [, hours, minutes] = match;
  if (hours === undefined && minutes === undefined) return null; // 空の文字列
  return inRange(Number(hours ?? 0) * 60 + Number(minutes ?? 0));
}
