// 第67章 練習問題3: 予約の長さ（分）と、その表し方（本文 5節。予約のダイアログの「長さ」の材料）

/** 始まりから終わりまでの分。終わりが始まりより前なら RangeError */
export function lengthMinutes(startsAt: Date, endsAt: Date): number {
  // ここを書く
  throw new Error(`まだ書いていません（${startsAt.toISOString()} ${endsAt.toISOString()}）`);
}

/** 30 → '30 分'、60 → '1 時間'、90 → '1 時間 30 分'。0 以下か整数でなければ RangeError */
export function formatLength(minutes: number): string {
  // ここを書く
  throw new Error(`まだ書いていません（${minutes}）`);
}
