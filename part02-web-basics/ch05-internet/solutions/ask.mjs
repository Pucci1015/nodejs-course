// 練習問題6 の模範解答: サーバに1行送り、返事を1つ表示して終わるクライアント
// 使い方: node ask.mjs ポート 文字列
//   例: node ask.mjs 7020 hello   （echo-server.mjs を起動しておく）
import net from 'node:net';

const port = Number(process.argv[2] ?? 7020);
const text = process.argv[3] ?? 'hello';

const socket = net.connect(port, '127.0.0.1');

socket.on('connect', () => {
  socket.write(`${text}\n`);
});

socket.on('data', (chunk) => {
  console.log(`返事: ${chunk.toString().trim()}`);
  socket.end(); // 返事を1つ受け取ったら終わる
});

socket.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.log(`${port}番でサーバが起動していません`);
  } else {
    console.log(`エラー: ${err.code}`);
  }
});
