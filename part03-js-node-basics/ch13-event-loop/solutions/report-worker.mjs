// 練習問題8 の解答で使う Worker: 範囲を受け取り、素数を数えて送り返す
import { parentPort, workerData } from 'node:worker_threads';
import { countPrimes } from './primes.mjs';

parentPort.postMessage(countPrimes(workerData.from, workerData.to));
