// 練習問題3: CSRF トークンを作る・セッションに持つ・確かめる関数を作ってください。
// 要件は README にあります。
// 確かめ方: node --test csrf.test.mjs
import crypto from 'node:crypto';

export function newToken() {
  // ここを書く
}

export function ensureCsrf(session) {
  // ここを書く
}

export function checkCsrf(session, sent) {
  // ここを書く
}
