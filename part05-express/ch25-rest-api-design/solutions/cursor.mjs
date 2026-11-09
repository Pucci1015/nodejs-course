// 練習問題3の模範解答: カーソルでページを分ける（キーセット・ページネーション）
// 考え方: 「前のページの最後の項目の (並べ替えの値, id)」をカーソルに入れ、次のページは「それより後ろ」から始める。
//         SQL なら WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC LIMIT $3 にあたる（第6部 第30章）
import { signJson, unsignJson } from '../../lib/signed.mjs';

export class CursorError extends Error {
  constructor(message = 'cursor が正しくありません') {
    super(message);
    this.name = 'CursorError';
  }
}

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * @param {{ sort?: string, limit?: number, cursor?: string, secret: string }} options
 */
export function paginate(items, { sort = '-createdAt', limit = 20, cursor, secret }) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError('limit は 1〜100 の整数です'); // 追加
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  const dir = desc ? -1 : 1;
  // 修正: 値が同じなら id で並べる。並べ方が1通りに決まらないと、ページの境目で重なりや抜けが出る
  const order = (a, b) => dir * (cmp(a[field], b[field]) || cmp(a.id, b.id));
  const sorted = [...items].sort(order); // 追加: 元の配列は並べ替えない

  let rest = sorted;
  if (cursor !== undefined) {
    // 追加: 署名を確かめて読む。作り変えたカーソルや、別の鍵のカーソルは null になる
    const pos = unsignJson(cursor, secret);
    if (!pos || typeof pos !== 'object' || !('v' in pos) || !Number.isInteger(pos.id)) throw new CursorError();
    if (pos.s !== sort) throw new CursorError('このカーソルは、別の並べ方で作られたものです');
    const last = { [field]: pos.v, id: pos.id };
    // 修正: 「最後の項目の位置」ではなく「最後の項目の値より後ろ」を探す。
    //       その項目が消されていても、新しい項目が前に増えていても、続きから読める
    rest = sorted.filter((x) => order(x, last) > 0);
  }

  // 追加: 1件多く取ってみて、次のページがあるかを知る（空のページを作らない）
  const page = rest.slice(0, limit);
  const hasMore = rest.length > limit;
  const tail = page.at(-1);
  const nextCursor = hasMore ? signJson({ s: sort, v: tail[field], id: tail.id }, secret) : null;
  return { items: page, nextCursor };
}
