// 第25章 練習問題7の模範解答（ch25-rest-api-design/solutions/cursor.mjs）から、カーソルの作り方と読み方だけを残した（「変更（第6部）」）
// 第5部では、全部のタスクを JavaScript で並べ替えてから切り出していた。第6部では、並べ替えと切り出しを SQL がする
// （repositories/pg-tasks.ts の listPage。WHERE (並べる値, id) > (前のページの最後) ORDER BY … LIMIT …。第30章 6節）
// カーソルには「並べ方・前のページの最後の項目の (並べ替えの値, id)」を入れ、利用者が作り変えられないように署名する
// 変更（第7部）: TypeScript にした。カーソルの中身は Zod で確かめる（第38章）
import { z } from 'zod';
import type { CursorPosition, Sort, Task } from '../types.ts';
import { type Secrets, signJson, unsignJson } from './signed.ts';

export class CursorError extends Error {
  constructor(message = 'cursor が正しくありません') {
    super(message);
    this.name = 'CursorError';
  }
}

/** ページの最後の項目から、次のページのカーソルを作る */
export function encodeCursor(sort: Sort, last: Task, secret: Secrets): string {
  const field = sort.startsWith('-') ? sort.slice(1) : sort;
  // 変更（第7部）: last[field] だと、field が string なので型が付かない。並べ方ごとに、値を選ぶ
  const v = field === 'dueDate' ? last.dueDate : field === 'title' ? last.title : last.createdAt;
  return signJson({ s: sort, v, id: last.id }, secret);
}

// 追加（第7部）: カーソルの中身の形。署名が正しくても、古い版のサーバが作ったものかもしれないので、形も確かめる
const Position = z.object({
  s: z.string(),
  v: z.string().nullable(), // 並べ替えの値は、文字列（日時・日付・題名）か null だけ
  id: z.number().int(),
});

/** カーソルを読んで { v, id } を返す。作り変えたもの・別の鍵のもの・別の並べ方のものは CursorError */
export function decodeCursor(cursor: string, sort: Sort, secret: Secrets): CursorPosition {
  const r = Position.safeParse(unsignJson(cursor, secret));
  if (!r.success) throw new CursorError();
  if (r.data.s !== sort) throw new CursorError('このカーソルは、別の並べ方で作られたものです');
  return { v: r.data.v, id: r.data.id };
}
