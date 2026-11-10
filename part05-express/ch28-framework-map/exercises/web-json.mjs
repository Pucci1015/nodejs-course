// 練習問題1: Web 標準の Request・Response で、JSON を読む・エラーを返す関数を作ってください。
// 要件は README にあります。
// 確かめ方: node --test web-json.test.mjs
import http from 'node:http';

export async function readJson(request) {
  // ここを書く
}

export function problemResponse(status, instance) {
  // ここを書く（http.STATUS_CODES を使う）
}
