// 第68章 練習問題3 の模範解答: その日の予約の一覧のクエリを確かめる
// z.strictObject で知らない名前を断り、z.string() で配列（同じ名前が2回）を断る（第5部 第25章の parseListQuery と同じ考え）
import { z } from 'zod';
import { isDateString } from '../exercises/domain/time.ts';

export type DayQuery = { date: string; room?: number };
export type ParameterIssue = { parameter: string; detail: string };

const Schema = z.strictObject({
  date: z.string('1つだけ書いてください').refine(isDateString, 'YYYY-MM-DD の日付です'),
  room: z
    .string('1つだけ書いてください')
    .regex(/^[1-9]\d*$/, '1 以上の整数です')
    .transform(Number)
    .optional(),
});

export function parseDayQuery(query: unknown): { ok: true; value: DayQuery } | { ok: false; issues: ParameterIssue[] } {
  const r = Schema.safeParse(query);
  if (r.success) {
    const { date, room } = r.data;
    return { ok: true, value: room === undefined ? { date } : { date, room } };
  }
  const issues = r.error.issues.flatMap((i): ParameterIssue[] =>
    // 知らない名前は、1つの issue に keys の配列で入ってくる
    i.code === 'unrecognized_keys'
      ? i.keys.map((key) => ({ parameter: key, detail: `${key} は知らない名前です` }))
      : [{ parameter: String(i.path[0] ?? ''), detail: i.message }],
  );
  return { ok: false, issues };
}
