// 最初の TCP サーバ（第5章 3.2節・3.3節で書くものの完成形）
// 使い方: node first-server.mjs        別のターミナルで: nc 127.0.0.1 7001
import net from 'node:net';

const server = net.createServer((socket) => {
  // ここは、だれかが接続してくるたびに呼ばれる。socket は「1本の接続」
  console.log(`接続されました: ${socket.remoteAddress}:${socket.remotePort}`);
  socket.write('こんにちは\n'); // 相手に文字を送る
  socket.end(); // 接続を終える
});

// 7001番ポートで、127.0.0.1（自分の Mac の中）からの接続だけを待ち受ける
server.listen(7001, '127.0.0.1', () => {
  console.log('7001番で待ち受けています（Ctrl + C で終了）');
});
