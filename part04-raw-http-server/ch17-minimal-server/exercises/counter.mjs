// 練習問題2: 開かれた回数を数えて、JSON で返すハンドラを作ってください。
// 要件は README にあります。
// 確かめ方: node --test counter.test.mjs
// ブラウザで試す: node counter.mjs → http://127.0.0.1:9179/count
import http from 'node:http';

export function createCounterHandler() {
  // ここを書く（数を入れる変数と、ハンドラの関数を作って、ハンドラを return する）
}

if (import.meta.main) {
  http.createServer(createCounterHandler()).listen(9179, '127.0.0.1', () => console.log('http://127.0.0.1:9179/count で待っています（Ctrl+C で止める）'));
}
