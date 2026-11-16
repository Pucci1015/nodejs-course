'use server';
// 第49章 練習問題5の模範解答: 題名を変える Server Action。bind で id と version を決めてから使う
import { refresh } from 'next/cache';
import { z } from 'zod';
import { ApiError, updateTask } from '../../../lib/api.ts';

/** フォームの結果。エラーの文（無ければ null）と、打った題名 */
export type RenameState = { error: string | null; title: string };

const TitleSchema = z.string().trim().min(1, '題名を入れてください').max(100, '題名は 100 文字までです');
const isPositiveInt = (n: number) => Number.isInteger(n) && n > 0;

export async function renameTaskAction(id: number, version: number, _prev: RenameState, formData: FormData): Promise<RenameState> {
  const value = formData.get('title');
  const raw = typeof value === 'string' ? value : '';
  // bind した値も、ブラウザを通って届く。書き換えられていないか確かめる（本文4節）
  if (!isPositiveInt(id) || !isPositiveInt(version)) return { error: '送られた値が正しくありません', title: raw };
  const parsed = TitleSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? '題名が正しくありません', title: raw };

  try {
    await updateTask({ id, version }, { title: parsed.data });
  } catch (err) {
    if (err instanceof ApiError && [404, 409, 412].includes(err.status)) {
      refresh(); // 最新の内容を出してもらう
      return { error: err.message, title: raw };
    }
    throw err;
  }
  refresh();
  return { error: null, title: parsed.data };
}
