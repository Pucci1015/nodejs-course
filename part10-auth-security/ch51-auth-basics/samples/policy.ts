// 4節: パスワードの決まり。長さと「よく使われるパスワードではないこと」だけを確かめる（記号を必ず入れる、などはしない）
import { readFileSync } from 'node:fs';
import path from 'node:path';

// よく使われるパスワードの一覧（本物の一覧は数万〜数億件。ここでは短い見本）
const COMMON = new Set(
  readFileSync(path.join(import.meta.dirname, 'common-passwords.txt'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== ''),
);

export const MIN_LENGTH = 12;
export const MAX_LENGTH = 128;

/** 守れていない決まりの文を返す。空の配列なら合格 */
export function checkPassword(password: string, email: string): string[] {
  // NFKC: 全角の英数字を半角にするなど、見た目が同じ文字を1つの形にそろえる
  const normalized = password.normalize('NFKC');
  // 長さは「文字の数」で数える（[...文字列] は、絵文字なども1文字として数える）
  const length = [...normalized].length;
  const errors: string[] = [];
  if (length < MIN_LENGTH) errors.push(`パスワードは ${MIN_LENGTH} 文字以上にしてください`);
  if (length > MAX_LENGTH) errors.push(`パスワードは ${MAX_LENGTH} 文字までにしてください`);
  if (COMMON.has(normalized.toLowerCase())) errors.push('よく使われるパスワードです。別のものにしてください');
  const localPart = email.split('@')[0] ?? '';
  if (localPart !== '' && normalized.toLowerCase().includes(localPart.toLowerCase())) {
    errors.push('メールアドレスを含まないパスワードにしてください');
  }
  return errors;
}
