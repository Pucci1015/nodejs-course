// 練習問題4: アクセスログのミドルウェア
// 応答が終わったら、1回だけ write({ … }) を呼ぶ。要件は exercises/README.md の問題4です。確かめ方:
//   $ node --test access-log.test.mjs

/**
 * @param {{ write: (entry: object) => void, now?: () => number }} options
 * @returns {import('express').RequestHandler}
 */
export function accessLog({ write, now = () => performance.now() }) {
  return (req, res, next) => {
    // ここを書く
    // よくある間違い: ここで write すると、まだ応答していないので status はいつも 200
    write({ method: req.method, path: req.originalUrl, status: res.statusCode, ms: 0, bytes: 0 });
    next();
  };
}
