// 第66章 4節: 小さな負荷の道具。同時に C 本、S 秒のあいだ、URL を GET し続け、かかった時間の分布を出す
// 動かし方（章のフォルダで）: node samples/load.ts http://127.0.0.1:9867/fast 10 5
const [url = 'http://127.0.0.1:9867/fast', c = '10', s = '5'] = process.argv.slice(2);
const concurrency = Number(c);
const endAt = performance.now() + Number(s) * 1000;
const times: number[] = [];
let errors = 0;

async function worker() {
  while (performance.now() < endAt) {
    const start = performance.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      await res.arrayBuffer(); // 本文を最後まで読む
      if (!res.ok) errors += 1;
    } catch {
      errors += 1;
    }
    times.push(performance.now() - start);
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

times.sort((a, b) => a - b);
const pick = (p: number) => times[Math.min(times.length - 1, Math.ceil((p / 100) * times.length) - 1)] ?? 0;
console.log(`${url}  同時 ${concurrency}・${s} 秒`);
console.log(`  ${times.length} 回（毎秒 ${(times.length / Number(s)).toFixed(0)} 回）、失敗 ${errors} 回`);
console.log(`  p50 ${pick(50).toFixed(1)}ms  p95 ${pick(95).toFixed(1)}ms  p99 ${pick(99).toFixed(1)}ms  最大 ${pick(100).toFixed(1)}ms`);
