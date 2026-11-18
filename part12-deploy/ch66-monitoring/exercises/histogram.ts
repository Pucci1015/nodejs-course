// 第66章 練習問題5: ヒストグラム。バケツごとに数え、そこからパーセンタイルを推定する（本文 3節）

export type Snapshot = { buckets: { le: number; count: number }[]; sum: number; count: number };

export class Histogram {
  constructor(buckets: number[]) {
    // ここを書く
    void buckets;
  }

  observe(value: number): void {
    // ここを書く
    throw new Error(`まだ書いていません（${value}）`);
  }

  /** バケツごとの累積の数（最後に le: Infinity）、合計、数 */
  snapshot(): Snapshot {
    // ここを書く
    throw new Error('まだ書いていません');
  }

  /** q（0〜1）の分位数を、バケツの中は一様に散らばっているとして推定する。数が 0 なら NaN */
  quantile(q: number): number {
    // ここを書く
    throw new Error(`まだ書いていません（${q}）`);
  }
}
