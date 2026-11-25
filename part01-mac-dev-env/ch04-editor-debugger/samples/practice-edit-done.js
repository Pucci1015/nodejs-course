// 第4章 5.5節: practice-edit.js を書き換えた後の形（見比べる用）
// 使い方（~/dev/ch04 で）: node samples/practice-edit-done.js
// 出力は practice-edit.js と同じ。切り出した関数の形は、人によって少し違ってもかまわない。

const price = 120;
const count = 3;
const total = calcTotal();
console.log(`1個 ${price}円 × ${count}個`);
console.log(`合計: ${total}円`);

function calcTotal() {
  return price * count;
}
