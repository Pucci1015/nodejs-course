// 第51章 練習問題1: メールアドレスをそろえる（本文5節の Credentials の email と同じ決まり）
import { z } from 'zod';

/** 前後の空白を除いて小文字にする。メールアドレスの形でない・254 文字より長い・文字列でないなら null */
export function normalizeEmail(input: unknown): string | null {
  // ここを書く（z を使う）
  void z;
  throw new Error(`まだ書いていません: ${String(input)}`);
}
