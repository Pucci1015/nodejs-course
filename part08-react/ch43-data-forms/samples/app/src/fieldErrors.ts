// 第43章 5.3節: API の problem+json の errors[] を、「項目の名前 → 文」にする
import type { Problem } from './api.ts';

export function toFieldErrors(problem: Problem): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of problem.errors ?? []) {
    // pointer は '#/title' の形（第25章）。'#/' を除いた残りが項目の名前
    const name = e.pointer?.replace(/^#\//, '') ?? '';
    out[name] ??= e.detail;
  }
  return out;
}
