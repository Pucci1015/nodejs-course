// 練習問題6: イベントループが止まったことに気付く「見張り」を作ってください。
// 要件は README と lag-monitor.test.mjs にあります。
// 確かめ方: node --test lag-monitor.test.mjs

/**
 * @param {object} [options]
 * @param {number} [options.intervalMs=20]   何 ms ごとに確かめるか
 * @param {number} [options.thresholdMs=100] 予定より何 ms 以上遅れたら「止まった」とみなすか
 * @param {(info: { lagMs: number, at: Date }) => void} [options.onLag]  止まったことに気付いたときに呼ぶ
 * @returns {{ stop(): void, stats(): { max: number, count: number } }}
 */
export function createLagMonitor({ intervalMs = 20, thresholdMs = 100, onLag = () => {} } = {}) {
  // ここを書く
}
