// 練習問題2: 素数を数える計算を、Worker で行う関数を作ってください。
// 要件は README と worker-count.test.mjs にあります。確かめ方: node --test worker-count.test.mjs
import { Worker } from 'node:worker_threads';

// count-worker.mjs を Worker で動かし、from〜to の素数の数で成功する Promise を返す。
// Worker の中で例外が起きたら、その例外で失敗する
export function countPrimesInWorker(from, to) {
  // ここを書く
}
