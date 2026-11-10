// WebSocket の始まり（ハンドシェイク）と、フレームを手で読み書きする（第27章 4節）
// 仕組みを見るためのものです。本物では ws などのライブラリを使います（ws-demo.mjs）
//   $ node samples/ws-handshake-demo.mjs
//   別のターミナルで（Node.js 22 からは、WebSocket のクライアントが組み込まれている）:
//     node -e "const ws = new WebSocket('ws://127.0.0.1:9342'); ws.onopen = () => ws.send('こんにちは'); ws.onmessage = (e) => { console.log(e.data); ws.close(); }"
//   ハンドシェイクのリクエストとレスポンスを見るとき:
//     curl -si -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' http://127.0.0.1:9342/ --max-time 1
import crypto from 'node:crypto';
import http from 'node:http';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'; // RFC 6455 で決まっている文字列

/** Sec-WebSocket-Accept = base64(SHA-1(key + GUID))。「WebSocket が分かるサーバだ」という証拠 */
const acceptOf = (key) => crypto.createHash('sha1').update(key + GUID).digest('base64');

/** 1つのフレームを読む（このサンプルは、126 バイト未満の、分かれていないフレームだけ） */
function readFrame(buf) {
  const fin = (buf[0] & 0x80) !== 0;
  const opcode = buf[0] & 0x0f; // 1: 文字、2: バイナリ、8: 閉じる、9: ping、10: pong
  const masked = (buf[1] & 0x80) !== 0; // 客から来るフレームは、必ずマスクされている
  const len = buf[1] & 0x7f;
  if (!fin || len >= 126) throw new Error('このサンプルでは、小さなフレームしか読めません');
  const mask = buf.subarray(2, 6);
  const payload = Buffer.from(buf.subarray(6, 6 + len));
  if (masked) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4]; // 4 バイトの鍵で XOR を戻す
  return { opcode, payload };
}

/** 文字のフレームを作る（サーバから送るものは、マスクしない） */
function textFrame(text) {
  const payload = Buffer.from(text);
  if (payload.length >= 126) throw new Error('このサンプルでは、小さなフレームしか送れません');
  return Buffer.concat([Buffer.from([0x81, payload.length]), payload]); // 0x81 = FIN + 文字
}

const server = http.createServer((req, res) => {
  res.writeHead(426, { 'Content-Type': 'text/plain; charset=utf-8', Upgrade: 'websocket' }).end('WebSocket で接続してください\n');
});

// Upgrade: websocket のリクエストは、ふつうの 'request' ではなく 'upgrade' で来る
server.on('upgrade', (req, socket) => {
  console.log('--- 届いたハンドシェイク');
  console.log(`${req.method} ${req.url} HTTP/${req.httpVersion}`);
  for (const [k, v] of Object.entries(req.headers)) console.log(`${k}: ${v}`);

  const key = req.headers['sec-websocket-key'];
  if (req.headers['sec-websocket-version'] !== '13' || !key) {
    socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    return;
  }
  // 101 Switching Protocols を返したら、この TCP の接続は HTTP ではなく WebSocket になる
  const response = ['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${acceptOf(key)}`, '', ''].join('\r\n');
  console.log('--- 返すもの');
  console.log(response.trim());
  socket.write(response);

  socket.on('data', (buf) => {
    try {
      const { opcode, payload } = readFrame(buf);
      if (opcode === 8) {
        console.log('--- 閉じるフレームが来ました');
        socket.end(Buffer.from([0x88, 0])); // 閉じるフレームを返して終わる
        return;
      }
      const text = payload.toString();
      console.log(`--- 届いた文字: ${text}（フレームは ${buf.length} バイト: ${buf.toString('hex')}）`);
      socket.write(textFrame(`サーバから: ${text}`));
    } catch (e) {
      console.log(e.message);
      socket.destroy();
    }
  });
});

server.listen(9342, '127.0.0.1', () => {
  console.log('ws://127.0.0.1:9342/ で待っています（Ctrl+C で止める）');
});
