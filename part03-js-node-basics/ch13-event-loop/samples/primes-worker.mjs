// worker-demo.mjs が Worker として起動するファイル（第13章 6節）
// メインのスレッドから受け取った範囲の素数を数え、結果を送り返す。
import { parentPort, workerData } from 'node:worker_threads';
import { countPrimes } from './primes.mjs';

parentPort.postMessage(countPrimes(workerData.from, workerData.to));
