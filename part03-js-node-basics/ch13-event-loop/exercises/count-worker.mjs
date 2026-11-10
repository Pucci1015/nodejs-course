// 練習問題2 用: Worker の中で動くプログラム。これは完成しています（変えないでください）
// workerData の { from, to } を受け取り、素数の数を数えて、メインのスレッドに送る
import { parentPort, workerData } from 'node:worker_threads';
import { countPrimes } from './primes.mjs';

const { from, to } = workerData;
if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
  throw new RangeError(`範囲が正しくありません: ${from}〜${to}`); // メインのスレッドでは 'error' イベントになる
}
parentPort.postMessage(countPrimes(from, to));
