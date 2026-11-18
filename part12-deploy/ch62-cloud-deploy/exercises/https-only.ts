// 第62章 練習問題2: http で来た頼みを https へ（本文3節）
import type { RequestHandler } from 'express';

export type HttpsOnlyOptions = {
  /** false なら何もしない（開発とテスト） */
  enabled: boolean;
  /** http のままでよいパス（PaaS のヘルスチェック）。既定は ['/healthz', '/readyz'] */
  exempt?: string[];
};

export function httpsOnly(options: HttpsOnlyOptions): RequestHandler {
  // ここを書く
  throw new Error(`まだ書いていません: ${JSON.stringify(options)}`);
}
