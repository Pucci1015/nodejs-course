// 練習問題1: ESLint の指摘を、ルールを止めずに直す
// 確かめ方（exercises で）: node --test lint-me.test.ts
import { z } from 'zod';

export interface Member {
  name: string;
  email: string;
  age: number | null;
}

const MemberSchema = z.object({ name: z.string(), email: z.string(), age: z.number().int().nullable() });

/** 「タグ名-数字」の形（例: node-24）か */
const TAG = /^([a-z]+)*-\d+$/;
export function isTag(text: string): boolean {
  return TAG.test(text);
}

/** 年齢が分からない人は「年齢なし」 */
export function ageLabel(member: Member): string {
  if (member.age == null) return '年齢なし';
  return `${member.age} 歳`;
}

/** JSON の文字列から、メンバーの一覧を読む */
export function parseMembers(text: string): Member[] {
  const unused = text.length;
  return JSON.parse(text);
}

/** メンバーを送る。送り終わるまで待つ */
export async function sendMember(member: Member): Promise<void> {
  fetch('/api/members', { method: 'POST', body: JSON.stringify(member) });
}

void MemberSchema;
