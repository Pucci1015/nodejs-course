// 第26章 練習問題4の模範解答（ch26-app-structure/solutions/request-logger.mjs）のコピー。そのまま使う
// リクエストごとのログを、応答の後に1行だけ書くミドルウェア（第24章の accessLog の代わり）
import crypto from 'node:crypto';

const ID_RE = /^[A-Za-z0-9._-]{1,64}$/;
const SECRET_QUERY = new Set(['token', 'password', 'secret', 'code', 'key']);

/** クエリの秘密の値を [redacted] にした URL */
export function redactUrl(originalUrl) {
  const q = originalUrl.indexOf('?');
  if (q === -1) return originalUrl;
  const params = new URLSearchParams(originalUrl.slice(q + 1));
  for (const name of new Set(params.keys())) {
    if (SECRET_QUERY.has(name.toLowerCase())) params.set(name, '[redacted]'); // set は同じ名前のものを1つにまとめる
  }
  return `${originalUrl.slice(0, q)}?${params.toString().replaceAll('%5Bredacted%5D', '[redacted]')}`;
}

/**
 * @param {{ logger: { child(bindings: object): any }, now?: () => number, genId?: () => string }} options
 *   logger は pino のロガー（child を持つもの）
 */
export function requestLogger({ logger, now = () => performance.now(), genId = () => crypto.randomUUID() }) {
  if (!logger || typeof logger.child !== 'function') throw new TypeError('logger には child を持つロガー（pino など）を渡してください');
  return (req, res, next) => {
    const start = now();
    // 修正: 前のプロキシが付けた id は、形を確かめてから使う（ログに好きな文字や、長い文字を入れさせない）
    const given = req.get('x-request-id');
    req.id = given !== undefined && ID_RE.test(given) ? given : genId();
    res.setHeader('X-Request-Id', req.id);
    // 追加: このリクエストの中で書くログには、いつも reqId が付く
    req.log = logger.child({ reqId: req.id });

    // 修正: リクエストが来た時点ではなく、応答が終わった後に1回だけ書く（ステータスと時間が分かる）
    res.once('close', () => {
      const status = res.writableFinished ? res.statusCode : 'aborted';
      // 追加: 5xx と切れたものは error、4xx は warn。数えたり、知らせを出したりしやすくする
      const level = status === 'aborted' || status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      req.log[level]({ method: req.method, url: redactUrl(req.originalUrl), status, ms: Math.round(now() - start) }, 'request');
    });
    next();
  };
}
