// 第67章 練習問題3 の模範解答: 予約の長さ（分）と、その表し方

export function lengthMinutes(startsAt: Date, endsAt: Date): number {
  const ms = endsAt.getTime() - startsAt.getTime();
  if (ms < 0) throw new RangeError('終わりが始まりより前です');
  return ms / 60_000;
}

export function formatLength(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes <= 0) throw new RangeError(`長さは 1 以上の整数の分です: ${minutes}`);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} 分`;
  return m === 0 ? `${h} 時間` : `${h} 時間 ${m} 分`;
}
