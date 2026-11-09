// 練習問題4: リクエストごとのログを、応答の後に1行だけ書くミドルウェア
// 要件は exercises/README.md の問題4です。確かめ方:
//   $ node --test request-logger.test.mjs
import crypto from 'node:crypto';

/** クエリの秘密の値を [redacted] にした URL */
export function redactUrl(originalUrl) {
  return originalUrl; // ここを書く
}

export function requestLogger({ logger, now = () => performance.now(), genId = () => crypto.randomUUID() }) {
  return (req, res, next) => {
    // ここを書く: 今は、リクエストが来た時点で書いている。id も、子のロガーも無い
    req.id = req.get('x-request-id') ?? genId();
    logger.info({ method: req.method, url: req.originalUrl, status: res.statusCode }, 'request');
    next();
  };
}
