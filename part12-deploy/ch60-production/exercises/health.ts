// 第60章 練習問題5: /healthz と /readyz のルーター（本文8節）
import { Router } from 'express';

export type HealthOptions = {
  /** 頼みを受ける前に確かめるもの。名前 → 確かめる関数（失敗なら reject） */
  checks: Record<string, () => Promise<unknown>>;
  /** 1つの確かめを待つ時間（ミリ秒） */
  timeoutMs: number;
  /** 止めている途中なら true */
  isStopping: () => boolean;
};

export function createHealthRouter(options: HealthOptions): Router {
  const router = Router();
  // ここを書く
  void options;
  router.use(() => {
    throw new Error('まだ書いていません');
  });
  return router;
}
