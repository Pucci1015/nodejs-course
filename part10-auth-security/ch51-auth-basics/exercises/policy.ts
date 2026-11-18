// 第51章 練習問題3: パスワードの決まりを、設定できる形にする（本文4節）
export type PolicyError = 'too_short' | 'too_long' | 'common' | 'contains_email';
export type Policy = { min: number; max: number; common: ReadonlySet<string> };

/** 守れていない決まりを、too_short・too_long・common・contains_email の順で返す */
export function checkPassword(password: string, email: string, policy: Policy): PolicyError[] {
  // ここを書く
  throw new Error(`まだ書いていません: ${password.length} ${email} ${policy.min}`);
}
