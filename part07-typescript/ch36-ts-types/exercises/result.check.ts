// 練習問題7 の型の確かめ（書き換えない）
import type { Equal, Expect } from './type-assert.ts';
import { err, ok, parseDueDate, parseLimit, parseNewTask, unwrapOr, type Result } from './result.ts';

const r1: Result<number> = ok(1);
const r2: Result<number> = err('だめ');
const r3: Result<string, string[]> = err(['a', 'b']);
const n = unwrapOr(parseLimit('5'), 20);
declare const r4: Result<string, string[]>;
const s = unwrapOr(r4, '決まり');

export type Checks = [
  Expect<Equal<Result<number>, { ok: true; value: number } | { ok: false; error: string }>>,
  Expect<Equal<ReturnType<typeof ok<number>>, { ok: true; value: number }>>,
  Expect<Equal<ReturnType<typeof err<string>>, { ok: false; error: string }>>,
  Expect<Equal<Parameters<typeof parseLimit>, [text: string | undefined]>>,
  Expect<Equal<ReturnType<typeof parseLimit>, Result<number>>>,
  Expect<Equal<Parameters<typeof parseDueDate>, [text: string]>>,
  Expect<Equal<ReturnType<typeof parseDueDate>, Result<string>>>,
  Expect<Equal<Parameters<typeof parseNewTask>, [input: { title?: string; dueDate?: string }]>>,
  Expect<Equal<ReturnType<typeof parseNewTask>, Result<{ title: string; dueDate: string | null }, string[]>>>,
  Expect<Equal<typeof n, number>>,
  Expect<Equal<typeof s, string>>,
];

const r = parseLimit('5');
// @ts-expect-error ok を確かめる前は value を読めない
console.log(r.value);
if (r.ok) console.log(r.value + 1);
else console.log(r.error.length);
console.log(r1, r2, r3);
