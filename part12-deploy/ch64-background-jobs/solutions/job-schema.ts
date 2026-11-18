// 第64章 練習問題2: 仕事のデータを、取り出したときに Zod で確かめる（本文 5.2節）
import { z } from 'zod';

// 3 種類の仕事。name で見分けるユニオン（第7部 第36章・第38章）。strictObject は知らない項目を断る
export const JobSchema = z.discriminatedUnion('name', [
  z.strictObject({
    name: z.literal('send-mail'),
    to: z.email(),
    subject: z.string().min(1).max(200),
    text: z.string().min(1),
  }),
  z.strictObject({
    name: z.literal('delete-file'),
    key: z.string().startsWith('files/'),
  }),
  z.strictObject({
    name: z.literal('daily-digest'),
    day: z.iso.date(), // YYYY-MM-DD
  }),
]);

export type JobData = z.infer<typeof JobSchema>;

/** name と data を確かめて、{ ok: true, job } か { ok: false, error }（どの項目が違うか）を返す */
export function parseJob(name: string, data: unknown): { ok: true; job: JobData } | { ok: false; error: string } {
  // data がオブジェクトでなければ、name だけのオブジェクトにして確かめる（項目が足りない、で失敗する）
  const input = typeof data === 'object' && data !== null ? { ...data, name } : { name };
  const r = JobSchema.safeParse(input);
  if (r.success) return { ok: true, job: r.data };
  const issue = r.error.issues[0];
  const where = issue?.path.join('.') || '(全体)';
  return { ok: false, error: `${where}: ${issue?.message ?? '形が違います'}` };
}
