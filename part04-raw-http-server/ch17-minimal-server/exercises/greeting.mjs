// 練習問題1: パスで返す文字を変えるハンドラを作ってください。
// 要件は README にあります。
// 確かめ方: node --test greeting.test.mjs
// ブラウザで試す: node greeting.mjs → http://127.0.0.1:9179/hello?name=alice
import http from 'node:http';

export function handler(req, res) {
  // ここを書く
}

// node greeting.mjs で直接実行したときだけ、サーバを起動する（テストから import したときは起動しない）
if (import.meta.main) {
  http.createServer(handler).listen(9179, '127.0.0.1', () => console.log('http://127.0.0.1:9179/ で待っています（Ctrl+C で止める）'));
}
