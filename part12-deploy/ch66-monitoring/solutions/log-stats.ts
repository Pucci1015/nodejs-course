// 第66章 練習問題2: 1 行 1 つの JSON のログを読んで、数える（本文 2節）
import { z } from 'zod';

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

// 使う項目だけを確かめる（ほかの項目はあってよい）
const RequestLine = z.object({ msg: z.literal('request'), url: z.string(), status: z.number().int(), ms: z.number() });
const ErrorLine = z.object({ level: z.number().min(50), errorId: z.string(), err: z.object({ message: z.string() }).optional() });

export function logStats(lines: string[]): LogStats {
  const stats: LogStats = { requests: 0, byStatus: {}, slowest: [], errors: [], skipped: 0 };
  const all: { url: string; ms: number }[] = [];
  for (const line of lines) {
    if (line.trim() === '') continue;
    let entry: unknown;
    try {
      entry = JSON.parse(line);
    } catch {
      stats.skipped += 1;
      continue;
    }
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      stats.skipped += 1;
      continue;
    }
    const req = RequestLine.safeParse(entry);
    if (req.success) {
      stats.requests += 1;
      const cls = `${Math.floor(req.data.status / 100)}xx`;
      stats.byStatus[cls] = (stats.byStatus[cls] ?? 0) + 1;
      all.push({ url: req.data.url, ms: req.data.ms });
    }
    const err = ErrorLine.safeParse(entry);
    if (err.success) stats.errors.push({ errorId: err.data.errorId, message: err.data.err?.message ?? '' });
  }
  // toSorted は安定（同じ ms なら元の順）なので、先に出た行が先になる
  stats.slowest = all.toSorted((a, b) => b.ms - a.ms).slice(0, 3);
  return stats;
}
