// 第56章 8節: カバレッジを測る関数。送料を決める

export function shippingFee(subtotal: number, { member = false, island = false } = {}): number {
  if (!Number.isInteger(subtotal) || subtotal < 0) {
    throw new RangeError('subtotal は 0 以上の整数にしてください');
  }
  if (member && subtotal >= 3000) return 0; // 会員は 3000 円から無料
  if (subtotal >= 5000) return island ? 500 : 0; // 5000 円から無料（離島は 500 円）
  return island ? 1200 : 600;
}
