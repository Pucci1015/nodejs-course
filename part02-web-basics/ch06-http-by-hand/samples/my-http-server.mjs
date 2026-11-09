// node:net だけで書く、小さな HTTP サーバ（第6章 5節で書くものの完成形）
// 使い方: node my-http-server.mjs        別のターミナルで: curl -v http://127.0.0.1:8085/
// 簡単にするため、1回の 'data' にリクエスト全体（ヘッダまで）が届くものとしている（本物のサーバはこれではいけない。8.4節）
import net from 'node:net';

// レスポンスを組み立てて送り、接続を閉じる
function respond(socket, status, reason, body) {
  socket.write(
    `HTTP/1.1 ${status} ${reason}\r\n` +
      'Content-Type: text/plain; charset=utf-8\r\n' +
      `Content-Length: ${Buffer.byteLength(body)}\r\n` + // 文字数ではなくバイト数
      'Connection: close\r\n' +
      '\r\n' +
      body,
  );
  socket.end();
}

const server = net.createServer((socket) => {
  socket.on('data', (chunk) => {
    const text = chunk.toString();
    const lines = text.split('\r\n');

    // 1行目（リクエスト行）: メソッド ターゲット バージョン
    const [method, target, version] = lines[0].split(' ');

    // 2行目から空行まで: ヘッダ。名前は小文字にそろえる
    const headers = {};
    for (const line of lines.slice(1)) {
      if (line === '') break; // 空行 = ヘッダの終わり
      const colon = line.indexOf(':');
      const name = line.slice(0, colon).toLowerCase();
      headers[name] = line.slice(colon + 1).trim();
    }

    console.log(`${method} ${target} ${version} （User-Agent: ${headers['user-agent']}）`);

    if (target === '/') {
      respond(socket, 200, 'OK', `${method} ${target} を受け取りました\n`);
    } else {
      respond(socket, 404, 'Not Found', '見つかりません\n');
    }
  });
});

server.listen(8085, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8085/ で待ち受けています');
});
