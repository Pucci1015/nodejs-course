// 第43章 練習問題1: API の problem+json の errors[] を、「項目の名前 → 文」にする（本文5.3節）
import type { Problem } from './api.ts';

export function toFieldErrors(problem: Problem): Record<string, string> {
  throw new Error('まだ書いていません');
}
