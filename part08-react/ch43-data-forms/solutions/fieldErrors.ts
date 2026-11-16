// 第43章 練習問題1の模範解答
import type { Problem } from '../exercises/api.ts';

export function toFieldErrors(problem: Problem): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of problem.errors ?? []) {
    // '#/dueDate' → 'dueDate'、'#/tags/0' → 'tags'（最初の部分だけ）
    const name = e.pointer !== undefined ? (e.pointer.replace(/^#\//, '').split('/')[0] ?? '') : (e.parameter ?? '');
    // ??= は「まだ無ければ入れる」。同じ項目の2つ目からは使わない
    out[name] ??= e.detail;
  }
  return out;
}
