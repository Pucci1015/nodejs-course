// 4.3節: 条件型（T extends X ? A : B）と infer。型の上の if
import { z } from 'zod';

// T が配列なら、その要素の型。そうでなければ never
type ElementOf<T> = T extends (infer E)[] ? E : never;
const a: ElementOf<string[]> = 'ねこ'; // string
const b: ElementOf<{ id: number }[]> = { id: 1 }; // { id: number }
// @ts-expect-error ElementOf<number> は never なので、何も入れられない
const c: ElementOf<number> = 1;

// オブジェクトに body という項目があり、それが Zod のスキーマなら、通した後の型。無ければ undefined
type BodyOf<S> = S extends { body: infer B extends z.ZodType } ? z.output<B> : undefined;
const d: BodyOf<{ body: z.ZodString }> = 'こんにちは'; // string
const e: BodyOf<{ query: z.ZodString }> = undefined; // body が無いので undefined

console.log(a, b, c, d, e);
