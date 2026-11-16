// 練習問題7: この JavaScript のファイルを stats.ts にコピーして、型を付けてください（README）
// このファイル（stats.mjs）は書き換えません

export function sum(nums) {
  let s = 0;
  for (const n of nums) s += n;
  return s;
}

export function mean(nums) {
  if (nums.length === 0) return null;
  return sum(nums) / nums.length;
}

export function median(nums) {
  if (nums.length === 0) return null;
  const sorted = nums.toSorted((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function summarize(nums) {
  if (nums.length === 0) return null;
  return { count: nums.length, min: Math.min(...nums), max: Math.max(...nums), mean: mean(nums) };
}

export function formatSummary(summary) {
  if (summary === null) return 'データがありません';
  return `${summary.count}件 最小 ${summary.min} 最大 ${summary.max} 平均 ${summary.mean.toFixed(1)}`;
}
