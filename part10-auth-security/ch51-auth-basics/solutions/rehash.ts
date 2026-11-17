// 第51章 練習問題5 の模範解答: 計算の重さを上げたら、ログインのときに作り直す
import { hashPassword, PARAMS, verifyPassword } from '../exercises/password.ts';

type Params = { m: number; t: number; p: number };

/** 保存してある文字列が、今の重さ（current）より軽ければ true。形が読めない文字列も true */
export function needsRehash(stored: string, current: Params = PARAMS): boolean {
  const m = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$/.exec(stored);
  if (m === null) return true;
  return Number(m[1]) < current.m || Number(m[2]) < current.t || Number(m[3]) !== current.p;
}

/** パスワードを確かめ、合っていて作り直しが要るなら、新しいハッシュも返す */
export async function verifyAndUpgrade(stored: string, password: string): Promise<{ ok: boolean; newHash: string | null }> {
  const ok = await verifyPassword(stored, password);
  if (!ok) return { ok: false, newHash: null };
  return { ok: true, newHash: needsRehash(stored) ? await hashPassword(password) : null };
}
