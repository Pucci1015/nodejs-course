// 第13章 1.1節で書く、計算でタイマーが遅れることを確かめるプログラムの完成形
// 使い方（~/dev/part03/ch13-event-loop で）: node samples/blocking-loop.mjs

const start = Date.now();
const t = () => `${String(Date.now() - start).padStart(4)}ms`;

setTimeout(() => console.log(t(), 'タイマーが呼ばれた（10ms 後のはず）'), 10);

console.log(t(), '500ms かかる計算を始める');
let count = 0;
while (Date.now() - start < 500) {
  count++; // 500ms たつまで、ひたすら数える（CPU を使い続ける）
}
console.log(t(), `計算が終わった（${count} 回まわった）`);
