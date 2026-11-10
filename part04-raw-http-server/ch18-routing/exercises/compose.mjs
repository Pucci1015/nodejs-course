// 練習問題8: ミドルウェアをつなぐ compose
// 仕様は README の練習問題8を見てください。
// 確かめる: node --test compose.test.mjs

export function compose(...middlewares) {
  // ここを書く（下は、後ろのミドルウェアを待たない書き方です）
  return async function composed(req, res, last) {
    for (const fn of middlewares) {
      fn(req, res, () => {});
    }
    if (last) await last(req, res);
  };
}
