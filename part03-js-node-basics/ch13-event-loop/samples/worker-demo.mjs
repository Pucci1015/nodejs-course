// 重い計算を worker_threads で別のスレッドに移す（第13章 6節）
// 使い方: node worker-demo.mjs
import { Worker } from 'node:worker_threads';
import { countPrimes } from './primes.mjs';

const LIMIT = 3_000_000;

/** fn を実行している間に、10ms ごとのタイマーが何回動けたかを数える */
async function measure(label, fn) {
  let ticks = 0;
  const timer = setInterval(() => ticks++, 10);
  const start = performance.now();
  const result = await fn();
  const elapsed = performance.now() - start;
  clearInterval(timer);
  console.log(
    `${label}: 結果 ${result.toLocaleString()}、${Math.round(elapsed)}ms、` +
      `その間にタイマーは ${ticks} 回動いた（空いていれば約 ${Math.floor(elapsed / 10)} 回）`,
  );
}

function inWorker(from, to) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./primes-worker.mjs', import.meta.url), { workerData: { from, to } });
    worker.once('message', resolve); // 結果が届いたら resolve
    worker.once('error', reject); // Worker の中で投げられた例外
    worker.once('exit', (code) => code !== 0 && reject(new Error(`Worker が終了コード ${code} で終わった`)));
  });
}

await measure('メインのスレッドで計算', async () => countPrimes(1, LIMIT));
await measure('Worker で計算        ', () => inWorker(1, LIMIT));

// 範囲を4つに分けて、4つの Worker で同時に計算する（CPU のコアが4つ以上あれば速くなる）
await measure('Worker 4つで分けて計算', async () => {
  const step = Math.ceil(LIMIT / 4);
  const ranges = [0, 1, 2, 3].map((i) => [i * step + 1, Math.min(LIMIT, (i + 1) * step)]);
  const counts = await Promise.all(ranges.map(([from, to]) => inWorker(from, to)));
  return counts.reduce((a, b) => a + b, 0);
});
