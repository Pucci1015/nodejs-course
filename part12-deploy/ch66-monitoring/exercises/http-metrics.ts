// 第66章 練習問題6: Express のミドルウェアで、リクエストを、ルートの形ごとに数える（本文 3.3節）
import type express from 'express';

export type HttpMetrics = {
  /** いちばん最初に app.use する */
  middleware: express.RequestHandler;
  /** Prometheus の文字の形 */
  render(): string;
};

export function createHttpMetrics(options: { now?: () => number } = {}): HttpMetrics {
  // ここを書く
  throw new Error(`まだ書いていません（${typeof options}）`);
}
