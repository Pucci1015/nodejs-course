// 練習問題9 の模範解答: node:net で GET を送り、ステータス・ヘッダ・ボディに分けて表示する
// 使い方: node http-get.mjs ポート パス
//   例: node http-get.mjs 8081 /hello-ja      （samples/http-echo-server.mjs を起動しておく）
import net from 'node:net';

const port = Number(process.argv[2] ?? 8081);
const path = process.argv[3] ?? '/';

const socket = net.connect(port, '127.0.0.1');
socket.setEncoding('utf8'); // 届いたバイトを、文字化けしないように文字列にしてもらう

socket.on('connect', () => {
  // Connection: close を付けたので、サーバは返し終わったら接続を閉じる → 'end' で終わりが分かる
  socket.write(`GET ${path} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`);
});

let response = '';
socket.on('data', (chunk) => {
  response += chunk;
});

socket.on('end', () => {
  const headerEnd = response.indexOf('\r\n\r\n');
  const head = response.slice(0, headerEnd);
  const body = response.slice(headerEnd + 4); // \r\n\r\n の4文字の後ろがボディ
  const [statusLine, ...headerLines] = head.split('\r\n');
  const status = statusLine.split(' ')[1];

  console.log(`ステータス: ${status}`);
  console.log('ヘッダ:');
  for (const line of headerLines) {
    console.log(`  ${line}`);
  }
  console.log('ボディ:');
  console.log(body);
});

socket.on('error', (err) => {
  console.log(`エラー: ${err.code}`);
});
