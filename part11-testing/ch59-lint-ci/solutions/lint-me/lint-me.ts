// 練習問題1の模範解答: ESLint の指摘を、ルールを止めずに直したもの
// 確かめ方（exercises で）: MODULE=../solutions/lint-me/lint-me.ts node --test lint-me.test.ts
import { z } from 'zod';

export interface Member {
  name: string;
  email: string;
  age: number | null;
}

const MemberSchema = z.object({ name: z.string(), email: z.string(), age: z.number().int().nullable() });

/** 「タグ名-数字」の形（例: node-24）か */
// 修正: ([a-z]+)* は、同じ文字列を何通りにも分けられ（ReDoS）、0回のくり返しで '-24' にも合ってしまう。
//       「1文字以上の小文字」を1回だけ書けば足りる
const TAG = /^[a-z]+-\d+$/;
export function isTag(text: string): boolean {
  return TAG.test(text);
}

/** 年齢が分からない人は「年齢なし」 */
export function ageLabel(member: Member): string {
  // 修正: == null は undefined にも合う。型は number | null なので === null で比べる（eqeqeq）
  if (member.age === null) return '年齢なし';
  return `${member.age} 歳`;
}

/** JSON の文字列から、メンバーの一覧を読む */
export function parseMembers(text: string): Member[] {
  // 修正: 使っていない変数を消し、any をそのまま返さずに Zod で確かめる
  return z.array(MemberSchema).parse(JSON.parse(text));
}

/** メンバーを送る。送り終わるまで待つ */
export async function sendMember(member: Member): Promise<void> {
  // 修正: await を付ける（付けないと、失敗が呼んだ側に届かない）
  await fetch('/api/members', { method: 'POST', body: JSON.stringify(member) });
}
