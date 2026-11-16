// 第25章 練習問題7の模範解答（ch25-rest-api-design/solutions/cursor.mjs）から、カーソルの作り方と読み方だけを残した（「変更（第6部）」）
// 第5部では、全部のタスクを JavaScript で並べ替えてから切り出していた。第6部では、並べ替えと切り出しを SQL がする
// （repositories/pg-tasks.mjs の listPage。WHERE (並べる値, id) > (前のページの最後) ORDER BY … LIMIT …。第30章 6節）
// カーソルには「並べ方・前のページの最後の項目の (並べ替えの値, id)」を入れ、利用者が作り変えられないように署名する
import { signJson, unsignJson } from './signed.mjs';

export class CursorError extends Error {
  constructor(message = 'cursor が正しくありません') {
    super(message);
    this.name = 'CursorError';
  }
}

/** ページの最後の項目から、次のページのカーソルを作る */
export function encodeCursor(sort, last, secret) {
  const field = sort.startsWith('-') ? sort.slice(1) : sort;
  return signJson({ s: sort, v: last[field], id: last.id }, secret);
}

/** カーソルを読んで { v, id } を返す。作り変えたもの・別の鍵のもの・別の並べ方のものは CursorError */
export function decodeCursor(cursor, sort, secret) {
  const pos = unsignJson(cursor, secret);
  if (!pos || typeof pos !== 'object' || !('v' in pos) || !Number.isInteger(pos.id)) throw new CursorError();
  if (pos.s !== sort) throw new CursorError('このカーソルは、別の並べ方で作られたものです');
  // 並べ替えの値は、文字列（日時・日付・題名）か null だけ
  if (pos.v !== null && typeof pos.v !== 'string') throw new CursorError();
  return { v: pos.v, id: pos.id };
}
