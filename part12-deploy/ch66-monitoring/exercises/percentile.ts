// 第66章 練習問題1: かかった時間の配列から、パーセンタイルとまとめを出す（本文 4.1節）

/** values（並んでいなくてよい）の p パーセンタイル（0〜100）。小さい方から数えて p % の位置の値 */
export function percentile(values: number[], p: number): number {
  // ここを書く
  throw new Error(`まだ書いていません（${values.length} ${p}）`);
}

export type Summary = { count: number; min: number; mean: number; p50: number; p95: number; p99: number; max: number };

export function summarize(values: number[]): Summary {
  // ここを書く
  throw new Error(`まだ書いていません（${values.length}）`);
}
