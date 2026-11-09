// 練習問題2・3 の模範解答: 接続してきた相手に、相手のアドレスと何人目かを伝えるサーバ
// 使い方: node hello-server.mjs [ポート]   既定: 7010
//   別のターミナルで: nc 127.0.0.1 7010
import net from 'node:net';

const port = Number(process.argv[2] ?? 7010); // 問題3: ポートを引数で変えられるようにする
let count = 0; // 何人目か。接続のたびに 1 増やすので、関数の外に置く

const server = net.createServer((socket) => {
  count += 1;
  const who = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`${count} 人目: ${who}`);
  socket.write(`あなたは ${who} です（${count} 人目）\n`);
  socket.end();
});

server.listen(port, '127.0.0.1', () => {
  console.log(`${port}番で待ち受けています`);
});
