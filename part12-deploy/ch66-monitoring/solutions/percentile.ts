// 第66章 練習問題1: かかった時間の配列から、パーセンタイルとまとめを出す（本文 4.1節）

/** values（並んでいなくてよい）の p パーセンタイル（0〜100）。小さい方から数えて p % の位置の値 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) throw new Error('values が空です');
  if (!(p >= 0 && p <= 100)) throw new Error(`p は 0〜100 です: ${p}`);
  const sorted = values.toSorted((a, b) => a - b); // 元の配列は並べ替えない
  // nearest-rank: 小さい方から ceil(p% × 個数) 番目（1 から数える）。p が 0 なら 1 番目
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[rank - 1] ?? 0;
}

export type Summary = { count: number; min: number; mean: number; p50: number; p95: number; p99: number; max: number };

export function summarize(values: number[]): Summary {
  if (values.length === 0) throw new Error('values が空です');
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    count: values.length,
    min: percentile(values, 0),
    mean: sum / values.length,
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    p99: percentile(values, 99),
    max: percentile(values, 100),
  };
}
