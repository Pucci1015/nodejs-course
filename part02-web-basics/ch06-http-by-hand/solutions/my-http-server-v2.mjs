// 練習問題2・3 の模範解答: 本文5節の my-http-server.mjs に、パスと 405 を足したもの
// 使い方: node my-http-server-v2.mjs        別のターミナルで: curl -i http://127.0.0.1:8085/hello-ja
import net from 'node:net';

// 問題3: 5つ目の引数で、ヘッダを足せるようにした（省略したら何も足さない）
function respond(socket, status, reason, body, extraHeaders = '') {
  socket.write(
    `HTTP/1.1 ${status} ${reason}\r\n` +
      'Content-Type: text/plain; charset=utf-8\r\n' +
      `Content-Length: ${Buffer.byteLength(body)}\r\n` +
      extraHeaders +
      'Connection: close\r\n' +
      '\r\n' +
      body,
  );
  socket.end();
}

const server = net.createServer((socket) => {
  socket.on('data', (chunk) => {
    const lines = chunk.toString().split('\r\n');
    const [method, target] = lines[0].split(' ');
    console.log(method, target);

    // 問題3: GET 以外は 405。使えるメソッドを Allow ヘッダで伝える
    if (method !== 'GET') {
      respond(socket, 405, 'Method Not Allowed', 'GET だけ使えます\n', 'Allow: GET\r\n');
    } else if (target === '/') {
      respond(socket, 200, 'OK', `${method} ${target} を受け取りました\n`);
    } else if (target === '/hello-ja') {
      respond(socket, 200, 'OK', 'こんにちは\n'); // 問題2
    } else if (target === '/time') {
      respond(socket, 200, 'OK', `今は ${new Date().toLocaleString('ja-JP')} です\n`); // 問題2
    } else {
      respond(socket, 404, 'Not Found', '見つかりません\n');
    }
  });
});

server.listen(8085, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8085/ で待ち受けています');
});
