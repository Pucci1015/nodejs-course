// 第64章 練習問題2: 仕事のデータを、取り出したときに Zod で確かめる（本文 5.2節）
import { z } from 'zod';

// ここを書く: 3 種類の仕事のスキーマを、name で見分けるユニオンにする
export const JobSchema = z.never();

export type JobData = z.infer<typeof JobSchema>;

/** name と data を確かめて、{ ok: true, job } か { ok: false, error }（どの項目が違うか）を返す */
export function parseJob(name: string, data: unknown): { ok: true; job: JobData } | { ok: false; error: string } {
  // ここを書く
  throw new Error(`まだ書いていません（${name} ${typeof data}）`);
}
