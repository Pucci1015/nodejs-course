// 練習問題1 用: 1つのファイルに全部を書いたもの（完成しています。変えないでください）
// 使い方: node cart-all.mjs
// このファイルを、計算の部品（cart.mjs）と、表示する所（cart-main.mjs）に分けるのが練習問題1です。

function subtotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function withTax(amount, rate = 0.1) {
  return Math.round(amount * (1 + rate));
}

function formatYen(n) {
  return `${n.toLocaleString('ja-JP')}円`;
}

const items = [
  { name: 'ノート', price: 180, qty: 3 },
  { name: 'ペン', price: 120, qty: 2 },
  { name: 'ファイル', price: 1500, qty: 1 },
];

const sub = subtotal(items);
console.log('小計:', formatYen(sub));
console.log('税込:', formatYen(withTax(sub)));
console.log('軽減税率なら:', formatYen(withTax(sub, 0.08)));
