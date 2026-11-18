// 第51章 練習問題1 の模範解答: メールアドレスをそろえる
import { z } from 'zod';

const Email = z.string().trim().toLowerCase().max(254).pipe(z.email());

/** 前後の空白を除いて小文字にする。メールアドレスの形でなければ null */
export function normalizeEmail(input: unknown): string | null {
  const parsed = Email.safeParse(input);
  return parsed.success ? parsed.data : null;
}
