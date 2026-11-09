// 練習問題4: 一覧のクエリを zod で確かめる
// 要件は exercises/README.md の問題4です。確かめ方:
//   $ node --test query.test.mjs
// 今のひな形は「とりあえず動く」ものです。テストを読んで、足りないところを直してください。
import { z } from 'zod';
import { HttpProblem } from '../samples/http-problem.mjs';

z.config(z.locales.ja());

export const SORTS = ['createdAt', '-createdAt', 'dueDate', '-dueDate', 'title', '-title'];

// ここを書く: ?limit=1&limit=2 のように配列で来たときの扱い
export const ListQuery = z
  .object({ // ここを書く: 知らない名前を断る
    status: z.string().optional(), // ここを書く: カンマで区切った todo・doing・done
    sort: z.string().default('-createdAt'), // ここを書く: SORTS の中からだけ
    limit: z.coerce.number().default(20), // ここを書く: 1〜100 の整数だけ
    cursor: z.string().optional(),
    due_before: z.string().optional(), // ここを書く: YYYY-MM-DD
  })
  .transform(({ status, sort, limit, cursor, due_before }) => ({
    status: status ? status.split(',') : undefined,
    sort: { field: sort.replace(/^-/, ''), desc: sort.startsWith('-') },
    limit,
    cursor,
    dueBefore: due_before,
  }));

export function parseListQuery(query) {
  const r = ListQuery.safeParse(query ?? {});
  if (r.success) return r.data;
  // ここを書く: issue を { parameter, detail } にする（知らない名前は、名前ごとに1つ）
  throw new HttpProblem(400, { title: 'クエリが正しくありません' });
}
