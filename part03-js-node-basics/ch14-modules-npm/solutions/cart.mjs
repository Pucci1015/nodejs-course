// 練習問題1 の模範解答: 計算の部品
export function subtotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

export function withTax(amount, rate = 0.1) {
  return Math.round(amount * (1 + rate));
}

export default function formatYen(n) {
  return `${n.toLocaleString('ja-JP')}円`;
}
