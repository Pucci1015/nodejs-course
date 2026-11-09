// 練習問題4 の模範解答: buggy-server.mjs の3つのバグを直したもの
// 使い方: node fixed-server.mjs [ポート]   既定: 8090
//   確かめ方（~/dev/ch06 で）: bash exercises/check-server.sh
import net from 'node:net';

const port = Number(process.argv[2] ?? 8090);
const HEADER_END = Buffer.from('\r\n\r\n');

function respond(socket, status, reason, body) {
  // 修正: Content-Length は文字数（body.length）ではなくバイト数
  const bytes = Buffer.from(body, 'utf8');
  socket.write(
    `HTTP/1.1 ${status} ${reason}\r\n` +
      'Content-Type: text/plain; charset=utf-8\r\n' +
      `Content-Length: ${bytes.length}\r\n` +
      '\r\n',
  );
  socket.write(bytes);
}

net
  .createServer((socket) => {
    // 修正: 1回の 'data' が1つのリクエストとは限らないので、接続ごとにバイトをためる
    let pending = Buffer.alloc(0);

    socket.on('data', (chunk) => {
      pending = Buffer.concat([pending, chunk]);

      // 1つの 'data' に複数のリクエストが入っていることもあるので、繰り返す
      while (true) {
        const headerEnd = pending.indexOf(HEADER_END);
        if (headerEnd === -1) return; // 修正: ヘッダの終わりがまだなら、続きを待つ（400 にしない）

        const [requestLine, ...headerLines] = pending.subarray(0, headerEnd).toString('latin1').split('\r\n');
        const [method, target] = requestLine.split(' ');
        const headers = {};
        for (const line of headerLines) {
          const colon = line.indexOf(':');
          // 修正: ヘッダ名は大文字・小文字を区別しないので、小文字にそろえて保存する
          headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim();
        }
        const length = Number(headers['content-length'] ?? 0);

        const bodyStart = headerEnd + HEADER_END.length;
        if (pending.length < bodyStart + length) return; // 修正: ボディが揃うまで待つ

        // 修正: ボディはバイト列のまま切り出してから文字列にする（文字の途中で切らない）
        const body = pending.subarray(bodyStart, bodyStart + length).toString('utf8');
        pending = pending.subarray(bodyStart + length); // 残りは次のリクエスト

        if (method === 'GET' && target === '/hello') {
          respond(socket, 200, 'OK', 'こんにちは\n');
        } else if (method === 'POST' && target === '/echo') {
          respond(socket, 200, 'OK', `受け取りました: ${body}\n`);
        } else {
          respond(socket, 404, 'Not Found', '見つかりません\n');
        }
      }
    });
    socket.on('error', () => {});
  })
  .listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/ で待ち受けています`));
