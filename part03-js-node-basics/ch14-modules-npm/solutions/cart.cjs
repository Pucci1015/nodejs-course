// 練習問題2 の模範解答: CommonJS で書いた cart
function subtotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function withTax(amount, rate = 0.1) {
  return Math.round(amount * (1 + rate));
}

function formatYen(n) {
  return `${n.toLocaleString('ja-JP')}円`;
}

module.exports = { subtotal, withTax, formatYen };
