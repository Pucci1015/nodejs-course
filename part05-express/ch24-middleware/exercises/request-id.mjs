// 練習問題1: リクエストに ID を付けるミドルウェアを返す関数を作ってください。
// 要件は README にあります。
// 確かめ方: node --test request-id.test.mjs
import crypto from 'node:crypto';

export function requestId() {
  return (req, res, next) => {
    // ここを書く
    next();
  };
}
