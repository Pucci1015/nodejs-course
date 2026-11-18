// 第62章 練習問題2: http で来た頼みを https へ（本文3節）
import type { RequestHandler } from 'express';

export type HttpsOnlyOptions = {
  /** false なら何もしない（開発とテスト） */
  enabled: boolean;
  /** http のままでよいパス（PaaS のヘルスチェック）。既定は ['/healthz', '/readyz'] */
  exempt?: string[];
};

export function httpsOnly(options: HttpsOnlyOptions): RequestHandler {
  const exempt = options.exempt ?? ['/healthz', '/readyz'];
  return (req, res, next) => {
    // req.secure は、trust proxy のときは X-Forwarded-Proto を見る（第60章 7.1節）
    if (!options.enabled || req.secure || exempt.includes(req.path)) {
      next();
      return;
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      // req.hostname も、trust proxy のときは X-Forwarded-Host を見る。originalUrl にはクエリも入っている
      res.redirect(308, `https://${req.hostname}${req.originalUrl}`);
      return;
    }
    // POST などを送り直させると、間違った作りの画面が気づかないまま、ボディを暗号化せずに送り続ける
    res.status(400).type('text/plain').send('HTTPS で送ってください\n');
  };
}
