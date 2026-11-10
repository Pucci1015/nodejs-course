// 第13章 2.1節で書く、待ち行列の順番を確かめるプログラムの完成形
// 使い方（~/dev/part03/ch13-event-loop で）: node samples/order-basic.mjs

console.log('A 同期');
setTimeout(() => console.log('B setTimeout 0'), 0);
Promise.resolve().then(() => console.log('C then'));
queueMicrotask(() => console.log('D queueMicrotask'));
console.log('E 同期');
