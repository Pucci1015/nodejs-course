// 練習問題4 用: バグが3つある、node:net で書いた HTTP サーバ
// 使い方: node buggy-server.mjs [ポート]   既定: 8090
//   GET  /hello  → 「こんにちは」を返す
//   POST /echo   → 受け取ったボディを「受け取りました: ...」として返す
// bash check-server.sh で、正しく動いているかを確かめられる。
import net from 'node:net';

const port = Number(process.argv[2] ?? 8090);

function respond(socket, status, reason, body) {
  socket.write(
    `HTTP/1.1 ${status} ${reason}\r\n` +
      'Content-Type: text/plain; charset=utf-8\r\n' +
      `Content-Length: ${body.length}\r\n` +
      '\r\n' +
      body,
  );
}

net
  .createServer((socket) => {
    socket.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      const headerEnd = text.indexOf('\r\n\r\n');
      if (headerEnd === -1) {
        respond(socket, 400, 'Bad Request', 'ヘッダの終わりがありません\n');
        return;
      }
      const [requestLine, ...headerLines] = text.slice(0, headerEnd).split('\r\n');
      const [method, target] = requestLine.split(' ');
      const headers = {};
      for (const line of headerLines) {
        const colon = line.indexOf(':');
        headers[line.slice(0, colon)] = line.slice(colon + 1).trim();
      }
      const length = Number(headers['Content-Length'] ?? 0);
      const body = Buffer.from(text.slice(headerEnd + 4)).subarray(0, length).toString('utf8');

      if (method === 'GET' && target === '/hello') {
        respond(socket, 200, 'OK', 'こんにちは\n');
      } else if (method === 'POST' && target === '/echo') {
        respond(socket, 200, 'OK', `受け取りました: ${body}\n`);
      } else {
        respond(socket, 404, 'Not Found', '見つかりません\n');
      }
    });
    socket.on('error', () => {});
  })
  .listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/ で待ち受けています`));
