// 練習問題2: ヘルスチェックの Router を作ってください。
// 要件は README にあります。
// 確かめ方: node --test health.test.mjs
import express from 'express';

export function createHealthRouter({ isReady }) {
  const router = express.Router();
  // ここを書く
  return router;
}
