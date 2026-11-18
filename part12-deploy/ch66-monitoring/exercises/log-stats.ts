// 第66章 練習問題2: 1 行 1 つの JSON のログを読んで、数える（本文 2節）

export type LogStats = {
  /** msg が 'request' の行の数 */
  requests: number;
  /** 状態の番号の、100 の位ごとの数（'2xx' など）。出てこないものは書かない */
  byStatus: Record<string, number>;
  /** 遅い順に 3 つまでの { url, ms }（同じ ms なら、先に出た行が先） */
  slowest: { url: string; ms: number }[];
  /** level が 50 以上の行の { errorId, message }（出てきた順） */
  errors: { errorId: string; message: string }[];
  /** JSON として読めない・オブジェクトでない行の数 */
  skipped: number;
};

export function logStats(lines: string[]): LogStats {
  // ここを書く
  throw new Error(`まだ書いていません（${lines.length}）`);
}
