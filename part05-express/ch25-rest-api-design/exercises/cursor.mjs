// 練習問題7: カーソルでページを分ける（キーセット・ページネーション）
// 要件は exercises/README.md の問題7です。確かめ方:
//   $ node --test cursor.test.mjs
import { signJson, unsignJson } from '../../lib/signed.mjs';

export class CursorError extends Error {
  constructor(message = 'cursor が正しくありません') {
    super(message);
    this.name = 'CursorError';
  }
}

/**
 * @template T
 * @param {T[]} items                 すべての項目（id を持つ）
 * @param {{ sort?: string, limit?: number, cursor?: string, secret: string }} options
 *        sort は 'createdAt'（古い順）や '-createdAt'（新しい順）のように、項目の名前と向き
 * @returns {{ items: T[], nextCursor: string | null }}
 */
export function paginate(items, { sort = '-createdAt', limit = 20, cursor, secret }) {
  // 今はオフセットのように「先頭から limit 件」を返すだけ。cursor を使っていない
  // ここを書く
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  const sorted = [...items].sort((a, b) => (a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0) * (desc ? -1 : 1));
  return { items: sorted.slice(0, limit), nextCursor: null };
}

export { signJson, unsignJson };
