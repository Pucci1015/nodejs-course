// 練習問題1 の模範解答: 部品を import して表示する
import formatYen, { subtotal, withTax } from './cart.mjs';

const items = [
  { name: 'ノート', price: 180, qty: 3 },
  { name: 'ペン', price: 120, qty: 2 },
  { name: 'ファイル', price: 1500, qty: 1 },
];

const sub = subtotal(items);
console.log('小計:', formatYen(sub));
console.log('税込:', formatYen(withTax(sub)));
console.log('軽減税率なら:', formatYen(withTax(sub, 0.08)));
