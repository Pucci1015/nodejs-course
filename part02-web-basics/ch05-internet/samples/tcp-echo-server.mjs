// TCP のエコーサーバ（第5章 4節）
// 受け取ったデータを大文字にして送り返す。HTTP ではない「素の TCP」を体験するためのもの。
// 使い方: node tcp-echo-server.mjs [ポート]   既定: 7000
//   別のターミナルで: nc localhost 7000   → 文字を打って Return。Ctrl + C で終了
import net from 'node:net';

const port = Number(process.argv[2] ?? 7000);

const server = net.createServer((socket) => {
  // socket は「1本の TCP 接続」。相手の IP アドレスとポート番号が分かる
  const who = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`[接続] ${who}`);
  socket.write('こんにちは。文字を送ると大文字にして返します\n');

  socket.on('data', (chunk) => {
    // chunk は Buffer（バイト列）。届いたひとかたまりの大きさを表示する
    console.log(`[受信] ${who} ${chunk.length} バイト: ${JSON.stringify(chunk.toString())}`);
    socket.write(chunk.toString().toUpperCase());
  });

  socket.on('end', () => console.log(`[切断] ${who}`));
  socket.on('error', (err) => console.log(`[エラー] ${who} ${err.code}`));
});

// 127.0.0.1 で待ち受ける = 自分の Mac の中からだけ接続できる
server.listen(port, '127.0.0.1', () => {
  console.log(`127.0.0.1:${port} で待ち受けています（Ctrl + C で終了）`);
});
