// 第12章 6.1節で書く、直列と並行の時間を比べるプログラムの完成形
// 使い方（~/dev/part03/ch12-async で）: node samples/timing.mjs

function delay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// 「ユーザーを取ってくる」などの代わり。ms ミリ秒かかる
function fakeFetch(name, ms) {
  return delay(ms, `${name}の結果`);
}

// 1. 順番に await する（直列）
let start = Date.now();
const user = await fakeFetch('ユーザー', 300);
const tasks = await fakeFetch('タスク', 200);
const notices = await fakeFetch('通知', 100);
console.log('直列:', user, tasks, notices, `${Date.now() - start}ms`);

// 2. 先に全部始めてから、まとめて待つ（並行）
start = Date.now();
const results = await Promise.all([
  fakeFetch('ユーザー', 300),
  fakeFetch('タスク', 200),
  fakeFetch('通知', 100),
]);
console.log('並行:', results, `${Date.now() - start}ms`);
