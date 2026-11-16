// 練習問題5 の模範解答
import { z } from 'zod';

export type FieldError = { pointer: string; detail: string };
export type Problem = { type: 'about:blank'; title: string; status: 400 | 422; detail: string; errors: FieldError[] };
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/** ['tags', 1] → '/tags/1'。~ は ~0、/ は ~1 にする（JSON Pointer、RFC 6901） */
export function toPointer(path: readonly PropertyKey[]): string {
  return path.map((key) => `/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`).join('');
}

const TITLES = { 400: 'Bad Request', 422: 'Unprocessable Content' } as const;

export function toProblem(error: z.ZodError, status: 400 | 422): Problem {
  const errors: FieldError[] = [];
  for (const issue of error.issues) {
    if (issue.code === 'unrecognized_keys') {
      // 知らない項目は、issue の path ではなく、その項目の場所を指す
      for (const key of issue.keys) errors.push({ pointer: toPointer([...issue.path, key]), detail: '知らない項目です' });
    } else {
      errors.push({ pointer: toPointer(issue.path), detail: issue.message });
    }
  }
  return { type: 'about:blank', title: TITLES[status], status, detail: '入力が正しくありません', errors };
}

/** schema で確かめる。通れば確かめた後の値、だめなら Problem */
export function parseOrProblem<S extends z.ZodType>(schema: S, value: unknown, status: 400 | 422 = 422): Result<z.output<S>, Problem> {
  const result = schema.safeParse(value);
  return result.success ? { ok: true, value: result.data } : { ok: false, error: toProblem(result.error, status) };
}
