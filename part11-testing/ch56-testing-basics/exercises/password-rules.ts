// 練習問題3 で確かめる関数（正しい実装）。書き換えないでください
// パスワードの決まり（第10部 第51章 4節を小さくしたもの）。問題が無ければ空の配列

export type Problem = 'too_short' | 'too_long' | 'contains_email' | 'common';

const COMMON = new Set(['password1234', 'qwertyuiop12', '123456789012']);

export function checkPassword(password: string, email: string): Problem[] {
  const problems: Problem[] = [];
  const length = [...password].length; // 文字の数（絵文字も1文字と数える）
  if (length < 12) problems.push('too_short');
  if (length > 64) problems.push('too_long');
  // メールアドレスの @ より前（3文字以上のとき）を、大文字・小文字を区別せずに含むか
  const local = (email.split('@')[0] ?? '').toLowerCase();
  if (local.length >= 3 && password.toLowerCase().includes(local)) problems.push('contains_email');
  if (COMMON.has(password.toLowerCase())) problems.push('common');
  return problems;
}
