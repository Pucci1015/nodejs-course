// 練習問題7: 失敗したら、待つ時間を少しずつ長くしながらやり直す retry を完成させてください。
// 要件は README と retry.test.mjs にあります。
// 確かめ方: node --test retry.test.mjs

/**
 * @param {(ctx: { attempt: number, signal: AbortSignal }) => Promise<any>} fn
 * @param {object} [options]
 * @param {number} [options.retries=3]       失敗したとき、やり直す回数（最初の1回は数えない）
 * @param {number} [options.baseMs=100]      1回目のやり直しの前に待つミリ秒
 * @param {number} [options.factor=2]        やり直すたびに、待つ時間を何倍にするか
 * @param {number} [options.maxMs=10000]     待つ時間の上限
 * @param {number} [options.timeoutMs]       1回の試行にかけてよいミリ秒（省略したら制限なし）
 * @param {(err: any, attempt: number) => boolean} [options.shouldRetry]  やり直す失敗かどうか
 * @param {(info: { attempt: number, delay: number, error: any }) => void} [options.onRetry]
 * @param {AbortSignal} [options.signal]     全体をやめるための signal
 */
export async function retry(fn, options = {}) {
  // ここを書く
}
