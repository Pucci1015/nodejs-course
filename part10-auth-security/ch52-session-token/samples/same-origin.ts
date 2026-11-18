// 5節: 書き換えのリクエストは、自分のサイトから来たものだけを受け付ける（CSRF への備え）
import type { RequestHandler } from 'express';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * GET などの読むだけのリクエストは通す。POST・PATCH・DELETE などは、
 * ブラウザが付ける Origin ヘッダが allowed のどれかと同じときだけ通す
 */
export function requireSameOrigin(allowed: readonly string[]): RequestHandler {
  return (req, res, next) => {
    if (SAFE.has(req.method)) return next();
    const origin = req.get('Origin');
    if (origin === undefined || !allowed.includes(origin)) {
      res.status(403).json({ detail: 'このサイトからのリクエストは受け付けません' });
      return;
    }
    next();
  };
}
