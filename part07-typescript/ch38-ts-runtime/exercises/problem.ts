// 練習問題5: ZodError を problem+json にする関数と、確かめた後の型を返すジェネリクスの関数を書いてください。要件は README にあります。
// 確かめ方: node --test problem.test.ts
import { z } from 'zod';

export type FieldError = { pointer: string; detail: string };
export type Problem = { type: 'about:blank'; title: string; status: 400 | 422; detail: string; errors: FieldError[] };
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function toPointer(path: readonly PropertyKey[]): string {
  throw new Error('まだ書いていません');
}

export function toProblem(error: z.ZodError, status: 400 | 422): Problem {
  throw new Error('まだ書いていません');
}

// ここに parseOrProblem を書く（引数と戻り値の型も自分で書く）
