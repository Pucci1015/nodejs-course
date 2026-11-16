// 練習問題3 の模範解答
import { z } from 'zod';

/** 数字だけの文字列を数にする（z.coerce は '' や ' 1' も通すので使わない。第5部 第25章 5.2節） */
const digits = (min: number, max: number) => z.string().regex(/^[0-9]{1,5}$/).transform(Number).pipe(z.number().min(min).max(max));

const ListQuerySchema = z.strictObject({
  status: z.enum(['todo', 'doing', 'done']).optional(),
  dueBefore: z.iso.date().optional(),
  limit: digits(1, 100).default(20),
  offset: digits(0, 10000).default(0),
});

export type ListQuery = z.output<typeof ListQuerySchema>;
export type QueryError = { parameter: string; detail: string };
export type ListQueryResult = { ok: true; value: ListQuery } | { ok: false; errors: QueryError[] };

export function parseListQuery(query: unknown): ListQueryResult {
  const result = ListQuerySchema.safeParse(query);
  if (result.success) return { ok: true, value: result.data };
  const errors: QueryError[] = [];
  for (const issue of result.error.issues) {
    if (issue.code === 'unrecognized_keys') {
      // 知らない名前は path が [] で、名前は keys に入っている。1つずつの間違いにする
      for (const key of issue.keys) errors.push({ parameter: key, detail: '知らない名前です' });
    } else {
      errors.push({ parameter: issue.path.map(String).join('.'), detail: issue.message });
    }
  }
  return { ok: false, errors };
}
