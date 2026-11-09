// 練習問題11 の模範解答: Connection: close に頼らず、Content-Length と chunked でレスポンスの終わりを判断する
// 使い方: node http-get-v2.mjs ポート パス
//   例: node http-get-v2.mjs 8081 /chunked      （samples/http-echo-server.mjs を起動しておく）
import net from 'node:net';

const port = Number(process.argv[2] ?? 8081);
const path = process.argv[3] ?? '/';

const socket = net.connect(port, '127.0.0.1');
socket.setTimeout(5000);

socket.on('connect', () => {
  // Connection: close は付けない。サーバは接続を開けたままにするので、'end' は来ない
  socket.write(`GET ${path} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\n\r\n`);
});

let received = Buffer.alloc(0); // 届いたバイトを、バイト列のままためる

socket.on('data', (chunk) => {
  received = Buffer.concat([received, chunk]);

  const headerEnd = received.indexOf('\r\n\r\n');
  if (headerEnd === -1) return; // ヘッダがまだ揃っていない

  // ヘッダを読む（名前は小文字にそろえる）
  const [statusLine, ...headerLines] = received.subarray(0, headerEnd).toString().split('\r\n');
  const headers = {};
  for (const line of headerLines) {
    const colon = line.indexOf(':');
    headers[line.slice(0, colon).toLowerCase()] = line.slice(colon + 1).trim();
  }
  const rest = received.subarray(headerEnd + 4); // ヘッダの後ろ（ボディの部分）

  let body;
  if (headers['transfer-encoding'] === 'chunked') {
    body = readChunked(rest);
  } else {
    const length = Number(headers['content-length'] ?? 0);
    if (rest.length >= length) body = rest.subarray(0, length);
  }
  if (body === undefined) return; // ボディがまだ揃っていない。次の 'data' を待つ

  console.log(statusLine);
  for (const line of headerLines) console.log(line);
  console.log('');
  console.log(body.toString());
  socket.destroy(); // 揃ったので、自分から接続を閉じる
});

// chunked のボディを読む。全部揃っていればつなげたバイト列を、まだなら undefined を返す
function readChunked(data) {
  const parts = [];
  let pos = 0;
  while (true) {
    const lineEnd = data.indexOf('\r\n', pos);
    if (lineEnd === -1) return undefined;
    const size = parseInt(data.subarray(pos, lineEnd).toString(), 16); // 長さは16進数
    if (size === 0) return Buffer.concat(parts); // 長さ 0 のかたまりで終わり
    const start = lineEnd + 2;
    if (data.length < start + size + 2) return undefined; // かたまりがまだ届いていない
    parts.push(data.subarray(start, start + size));
    pos = start + size + 2; // かたまりの後ろの \r\n を飛ばす
  }
}

socket.on('timeout', () => {
  console.log('時間切れ: 5秒たってもレスポンスが揃いませんでした');
  socket.destroy();
});
socket.on('error', (err) => console.log(`エラー: ${err.code}`));
