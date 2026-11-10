// queues-demo.mjs の CommonJS 版（第13章 3.3節）
// 使い方: node queues-demo.cjs

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
