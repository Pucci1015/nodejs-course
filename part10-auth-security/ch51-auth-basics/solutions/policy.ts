// 第51章 練習問題3 の模範解答: パスワードの決まりを、設定できる形にする
export type PolicyError = 'too_short' | 'too_long' | 'common' | 'contains_email';
export type Policy = { min: number; max: number; common: ReadonlySet<string> };

export function checkPassword(password: string, email: string, policy: Policy): PolicyError[] {
  const normalized = password.normalize('NFKC');
  const length = [...normalized].length;
  const lower = normalized.toLowerCase();
  const errors: PolicyError[] = [];
  if (length < policy.min) errors.push('too_short');
  if (length > policy.max) errors.push('too_long');
  if (policy.common.has(lower)) errors.push('common');
  const localPart = (email.split('@')[0] ?? '').toLowerCase();
  if (localPart.length >= 3 && lower.includes(localPart)) errors.push('contains_email');
  return errors;
}
