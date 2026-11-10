// 同期のコード・マイクロタスク・nextTick・タイマー・setImmediate の順番（第13章 2節・3節）
// 使い方: node queues-demo.mjs
//   同じ内容の CommonJS 版: node queues-demo.cjs   （nextTick の順番だけが変わる。本文 3.3節）

const log = (s) => console.log(s);

setTimeout(() => log('setTimeout 0'), 0);
setImmediate(() => log('setImmediate'));
Promise.resolve().then(() => log('Promise.then'));
queueMicrotask(() => log('queueMicrotask'));
process.nextTick(() => log('process.nextTick'));
log('同期のコード 1');

// マイクロタスクの中で足したマイクロタスクも、タイマーより先に全部片付く
Promise.resolve().then(() => {
  Promise.resolve().then(() => log('then の中の then'));
});
log('同期のコード 2');
