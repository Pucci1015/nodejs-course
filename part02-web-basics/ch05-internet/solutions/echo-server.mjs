// 練習問題5 の模範解答: 受け取ったものを、そのまま送り返すサーバ。bye で切断する
// 使い方: node echo-server.mjs [ポート]   既定: 7020
//   別のターミナルで: nc 127.0.0.1 7020
import net from 'node:net';

const port = Number(process.argv[2] ?? 7020);

const server = net.createServer((socket) => {
  console.log('[接続]');
  socket.on('data', (chunk) => {
    const text = chunk.toString();
    console.log(`[受信] ${chunk.length} バイト`);
    if (text.trim() === 'bye') {
      socket.end('さようなら\n'); // 送ってから接続を終える
    } else {
      socket.write(text);
    }
  });
  socket.on('end', () => console.log('[切断]'));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`${port}番で待ち受けています`);
});
