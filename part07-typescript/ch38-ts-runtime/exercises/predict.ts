// 練習問題4（調べる問題）: 動かす前に、①〜⑧が何と出力されるかを予想してください。README の問いに答えます
// 確かめ方: node predict.ts
import { z } from 'zod';

const show = (label: string, schema: z.ZodType, value: unknown) => {
  const r = schema.safeParse(value);
  console.log(label, r.success ? JSON.stringify(r.data) : `間違い（${r.error.issues.map((i) => i.code).join(', ')}）`);
};

const User = z.object({ name: z.string() });
show('①', User, { name: 'alice', admin: true });
show('②', z.strictObject({ name: z.string() }), { name: 'alice', admin: true });

const Num = z.coerce.number();
show('③', z.array(Num), ['12', '', ' ', '1e3', '0x10']);
show('④', Num, 'abc');

show('⑤', z.array(z.coerce.boolean()), ['true', 'false', '0', '']);
show('⑥', z.array(z.stringbool()), ['true', 'false', '0', 'yes']);

const Limit = z.number().default(20);
show('⑦', z.array(Limit), [undefined, 5]);
show('⑧', Limit, null);

// ⑨〜⑪ は動かさずに、エディタで型を見る（変数の名前の上にマウスを置く）
export const Opt = z.object({ a: z.string().optional(), b: z.string().nullable(), c: z.string().nullish() });
type Opt = z.infer<typeof Opt>; // ⑨

export const Len = z.string().transform((s) => s.length);
type LenIn = z.input<typeof Len>; // ⑩
type LenOut = z.output<typeof Len>; // ⑪

export type Answers = [Opt, LenIn, LenOut];
