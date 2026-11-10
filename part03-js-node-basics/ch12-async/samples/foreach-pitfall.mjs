// 第12章 7.1節・7.2節で書く、forEach と await の落とし穴を確かめるプログラムの完成形
// 使い方（~/dev/part03/ch12-async で）: node samples/foreach-pitfall.mjs

function delay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const waits = [300, 100, 200];

// 1. forEach に async 関数を渡す（間違い）
const done1 = [];
waits.forEach(async (ms) => {
  await delay(ms);
  done1.push(ms);
});
console.log('forEach の直後:', done1); // まだ何も終わっていない
await delay(400);
console.log('400ms 後:', done1); // 終わった順に入っている

// 2. for...of と await（1つずつ順番に）
const done2 = [];
let start = Date.now();
for (const ms of waits) {
  await delay(ms);
  done2.push(ms);
}
console.log('for...of:', done2, `${Date.now() - start}ms`);

// 3. map と Promise.all（全部を同時に）
start = Date.now();
const done3 = await Promise.all(waits.map((ms) => delay(ms, ms)));
console.log('Promise.all:', done3, `${Date.now() - start}ms`);
