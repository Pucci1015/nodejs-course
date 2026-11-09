// 練習問題6 解答例: ミドルウェアをつなぐ compose
// ミドルウェアは (req, res, next) を受け取る関数。await next() で、後ろのミドルウェアを全部動かす

/**
 * @param {...Function} middlewares
 * @returns {(req, res, last?) => Promise<void>} last は、最後に呼ぶ関数（無ければ何もしない）
 */
export function compose(...middlewares) {
  for (const fn of middlewares) {
    if (typeof fn !== 'function') throw new TypeError('ミドルウェアは関数にしてください');
  }
  return function composed(req, res, last) {
    let called = -1; // いちばん後ろまで進んだ番号
    async function dispatch(i) {
      // 同じミドルウェアの中で next() を2回呼ぶと、後ろが2回動いてしまう
      if (i <= called) throw new Error('next() が2回呼ばれました');
      called = i;
      const fn = i === middlewares.length ? last : middlewares[i];
      if (!fn) return;
      // async 関数の中で呼ぶので、fn が同期で例外を投げても rejected になる
      await fn(req, res, () => dispatch(i + 1));
    }
    return dispatch(0);
  };
}
