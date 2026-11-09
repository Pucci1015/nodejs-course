// 練習問題6 の解答: イベントループが止まったことに気付く見張り
// 確かめ方: cd ../exercises && MODULE=../solutions/lag-monitor.mjs node --test lag-monitor.test.mjs

export function createLagMonitor({ intervalMs = 20, thresholdMs = 100, onLag = () => {} } = {}) {
  for (const [name, value] of Object.entries({ intervalMs, thresholdMs })) {
    if (!(typeof value === 'number' && value > 0)) throw new RangeError(`${name} は正の数にしてください: ${value}`);
  }

  let max = 0;
  let count = 0;
  let last = performance.now();

  const timer = setInterval(() => {
    const now = performance.now();
    // 予定では intervalMs ごとに呼ばれる。それより遅れた分が、イベントループが止まっていた時間
    const lag = Math.max(0, now - last - intervalMs);
    last = now;
    max = Math.max(max, lag);
    if (lag >= thresholdMs) {
      count++;
      onLag({ lagMs: Math.round(lag), at: new Date() });
    }
  }, intervalMs);
  // 見張りのためだけにプロセスを生かし続けないようにする（本文 8節）
  timer.unref();

  return {
    stop: () => clearInterval(timer),
    stats: () => ({ max: Math.round(max), count }),
  };
}
