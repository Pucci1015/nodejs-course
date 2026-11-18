// 追加（第10部）: 書き換えのリクエストは、自分の画面から来たものだけを受け付ける（CSRF への備え。第52章 5節・第55章 5節）
// SameSite=Lax の Cookie に重ねる。Origin があれば、決めたオリジンのどれかであること。
// Origin が無ければ Sec-Fetch-Site を見る。どちらも無いのは、ブラウザでないもの（curl・テスト）なので通す
import type { RequestHandler } from 'express';
import { HttpProblem } from './problem.ts';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requireSameOrigin(allowedOrigins: readonly string[]): RequestHandler {
  return (req, _res, next) => {
    if (SAFE.has(req.method)) return next();
    const origin = req.get('origin');
    if (origin !== undefined) {
      if (allowedOrigins.includes(origin)) return next();
      return next(new HttpProblem(403, { detail: 'このサイトからのリクエストは受け付けません' }));
    }
    const site = req.get('sec-fetch-site');
    if (site === undefined || site === 'same-origin') return next();
    next(new HttpProblem(403, { detail: 'このサイトからのリクエストは受け付けません' }));
  };
}
