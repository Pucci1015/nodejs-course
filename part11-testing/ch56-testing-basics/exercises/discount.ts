// 練習問題7 で確かめる関数（正しい実装）。書き換えないでください
// 注文の合計を、クーポンを使って計算する

export interface Line {
  price: number;
  quantity: number;
}

export function total(lines: Line[], coupon?: string): number {
  let sum = 0;
  for (const { price, quantity } of lines) {
    if (quantity <= 0) throw new RangeError('quantity は 1 以上にしてください');
    sum += price * quantity;
  }
  if (coupon === undefined) return sum;
  if (coupon === 'HALF') return Math.floor(sum / 2); // 半額（1円未満は切り捨て）
  if (coupon.startsWith('OFF')) {
    // OFF500 なら 500 円引き（0 円より下にはしない）
    const off = Number(coupon.slice(3));
    if (!Number.isInteger(off) || off <= 0) throw new Error(`知らないクーポンです: ${coupon}`);
    return Math.max(0, sum - off);
  }
  throw new Error(`知らないクーポンです: ${coupon}`);
}
