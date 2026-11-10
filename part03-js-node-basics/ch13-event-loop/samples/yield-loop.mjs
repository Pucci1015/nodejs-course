// 第13章 6.2節で書く、計算を小分けにして合間に譲るプログラムの完成形
// 使い方（~/dev/part03/ch13-event-loop で）: node samples/yield-loop.mjs

const start = Date.now();
const t = () => `${String(Date.now() - start).padStart(4)}ms`;

function busy(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // 重い計算の代わり
  }
}

// タスクの待ち行列に入れて、その順番が来たら成功する Promise
const nextTask = () => new Promise((resolve) => setImmediate(resolve));

const timer = setInterval(() => console.log(t(), 'タイマー（100ms ごと）'), 100);

// 500ms の計算を、50ms ずつ10回に分ける
for (let i = 0; i < 10; i++) {
  busy(50);
  await nextTask(); // ここで、溜まったタイマーや I/O に順番を譲る
}
console.log(t(), '計算が終わった');
clearInterval(timer);
