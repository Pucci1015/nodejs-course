// 練習問題7 の模範解答。stats.mjs に型を付け、tsc が見つけた所を直した

export type Summary = { count: number; min: number; max: number; mean: number };

export function sum(nums: number[]): number {
  let s = 0;
  for (const n of nums) s += n;
  return s;
}

export function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return sum(nums) / nums.length;
}

export function median(nums: number[]): number | null {
  const sorted = nums.toSorted((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  // 修正: sorted[mid] の型は number | undefined。空の配列のとき undefined になるのを、ここでまとめて確かめる
  const upper = sorted[mid];
  if (upper === undefined) return null;
  if (sorted.length % 2 === 1) return upper;
  const lower = sorted[mid - 1];
  if (lower === undefined) return null; // 長さが偶数（2以上）なら来ないが、tsc にはそれが分からない
  return (lower + upper) / 2;
}

export function summarize(nums: number[]): Summary | null {
  if (nums.length === 0) return null;
  // 修正: mean(nums) は number | null を返すので、Summary の mean（number）に入れられない。ここで直接計算する
  return { count: nums.length, min: Math.min(...nums), max: Math.max(...nums), mean: sum(nums) / nums.length };
}

export function formatSummary(summary: Summary | null): string {
  if (summary === null) return 'データがありません';
  return `${summary.count}件 最小 ${summary.min} 最大 ${summary.max} 平均 ${summary.mean.toFixed(1)}`;
}
