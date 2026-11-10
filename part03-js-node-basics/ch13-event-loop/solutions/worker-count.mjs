// 練習問題2 の模範解答
import { Worker } from 'node:worker_threads';

export function countPrimesInWorker(from, to) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./count-worker.mjs', import.meta.url), { workerData: { from, to } });
    worker.once('message', resolve); // 結果が届いたら成功
    worker.once('error', reject); // Worker の中の例外は、ここに届く
  });
}
