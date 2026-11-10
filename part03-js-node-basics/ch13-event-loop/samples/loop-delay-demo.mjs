// イベントループの遅れを測る: perf_hooks.monitorEventLoopDelay（第13章 7節）
// 使い方: node loop-delay-demo.mjs
import { monitorEventLoopDelay } from 'node:perf_hooks';

// 10ms ごとに目を覚ます内部のタイマーを使い、「前に起きてから何 ms たったか」を記録する。
// 記録される値は「10ms + 遅れ」なので、表示するときに 10ms を引いて「遅れ」にする
const RESOLUTION = 10;
const histogram = monitorEventLoopDelay({ resolution: RESOLUTION });
histogram.enable();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function busy(ms) {
  const end = performance.now() + ms;
  while (performance.now() < end);
}

const ms = (ns) => `${Math.max(0, ns / 1e6 - RESOLUTION).toFixed(1).padStart(6)}ms`;
function report(label) {
  console.log(
    `${label}\n  遅れ: 平均 ${ms(histogram.mean)} / 99パーセンタイル ${ms(histogram.percentile(99))} / 最大 ${ms(histogram.max)}`,
  );
  histogram.reset();
}

// 1秒間、何もしない（タイマーを待つだけ）
await wait(1000);
report('何もしない 1秒');

// 1秒間、100ms ごとに 30ms 止める
for (let i = 0; i < 10; i++) {
  busy(30);
  await wait(70);
}
report('100ms ごとに 30ms 止める');

// 1回だけ 300ms 止める
await wait(100);
busy(300);
await wait(100);
report('1回だけ 300ms 止める');

histogram.disable();
