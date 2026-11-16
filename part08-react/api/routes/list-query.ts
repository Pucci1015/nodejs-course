// 第25章 練習問題6の模範解答（ch25-rest-api-design/solutions/query.mjs）のコピー。sort を文字列のまま返すようにした（「変更（成果物）」）
// 一覧のクエリを zod で確かめる
// 変更（第7部）: TypeScript にした。確かめた後の型は、スキーマから作る（ListQuery）
import { z } from 'zod';
import { HttpProblem, type ProblemError } from '../middleware/problem.ts';
import { SORTS, STATUSES } from '../types.ts';

z.config(z.locales.ja());


// 修正: Express 5 の req.query の値は「文字列か配列」。?limit=1&limit=2 は配列になるので、1回だけにする
const one = <S extends z.ZodType<unknown, string>>(schema: S) => z.string({ error: (i) => (Array.isArray(i.input) ? '1回だけ指定してください' : '文字列で指定してください') }).pipe(schema);

export const ListQuerySchema = z
  .strictObject({
    // 修正: カンマで区切った値を、1つずつ確かめる。同じものは1つにまとめる
    status: one(
      z
        .string()
        .transform((s) => s.split(','))
        .pipe(z.array(z.enum(STATUSES, { error: `status は ${STATUSES.join('・')} のどれか（カンマで区切って複数）` })))
        .transform((list) => [...new Set(list)]),
    ).optional(),
    // 修正: 並べる項目は、決めたものの中からだけ（データベースの列の名前をそのまま客に選ばせない）
    sort: one(z.enum(SORTS, { error: `sort は ${SORTS.join('・')} のどれか` })).default('-createdAt'),
    // 修正: z.coerce.number() は ''→0、' 20 '→20、'2e1'→20 にしてしまう。数字だけの文字列に限る
    limit: one(z.string().regex(/^[1-9][0-9]{0,2}$/, 'limit は 1〜100 の整数').transform(Number).pipe(z.number().max(100, 'limit は 1〜100 の整数'))).default(20),
    cursor: one(z.string().min(1).max(512)).optional(),
    due_before: one(z.iso.date({ error: 'due_before は YYYY-MM-DD の日付' })).optional(),
  })
  .transform(({ status, sort, limit, cursor, due_before }) => ({
    status,
    sort, // 変更（成果物）: '-createdAt' のまま。カーソル（lib/cursor.ts）がこの形で受け取る
    limit,
    cursor,
    dueBefore: due_before, // 追加: URL の書き方（snake_case）と、コードの中の名前を分ける
  }));

/** 追加（第7部）: 確かめた後のクエリの型 */
export type ListQuery = z.output<typeof ListQuerySchema>;

/** req.query を確かめて、使える形にする。間違いはすべて集めて 400 */
export function parseListQuery(query: unknown): ListQuery {
  const r = ListQuerySchema.safeParse(query ?? {});
  if (r.success) return r.data;
  const errors: ProblemError[] = [];
  for (const issue of r.error.issues) {
    // 修正: 知らない名前（strictObject の unrecognized_keys）は、名前ごとに1つずつ
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) errors.push({ parameter: key, detail: `${key} という名前は使えません` });
    } else {
      const e = { parameter: String(issue.path[0] ?? ''), detail: issue.message };
      // 'todo,x,y' のように、同じ名前で同じ文が何回も出るものは1つにする
      if (!errors.some((x) => x.parameter === e.parameter && x.detail === e.detail)) errors.push(e);
    }
  }
  throw new HttpProblem(400, { title: 'クエリが正しくありません', errors });
}
