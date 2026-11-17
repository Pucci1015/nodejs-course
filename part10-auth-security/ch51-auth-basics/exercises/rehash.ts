// 第51章 練習問題5: 計算の重さを上げたら、ログインのときに作り直す（本文3節）
import { hashPassword, PARAMS, verifyPassword } from './password.ts';

type Params = { m: number; t: number; p: number };

/** 保存してある文字列が、今の重さ（current）より軽ければ true。形が読めない文字列も true */
export function needsRehash(stored: string, current: Params = PARAMS): boolean {
  // ここを書く
  throw new Error(`まだ書いていません: ${stored} ${current.m}`);
}

/** パスワードを確かめ、合っていて作り直しが要るなら、新しいハッシュも返す */
export async function verifyAndUpgrade(stored: string, password: string): Promise<{ ok: boolean; newHash: string | null }> {
  // ここを書く（hashPassword・verifyPassword・needsRehash を使う）
  void hashPassword;
  void verifyPassword;
  throw new Error(`まだ書いていません: ${stored} ${password.length}`);
}
