// 練習問題8 の模範解答: 改行までを1行として取り出すサーバ（split と pop を使う）
// 使い方: node line-server.mjs [ポート]   既定: 7100
//   別のターミナルで: node exercises/ex-sender.mjs   （どちらも ~/dev/ch05 で）
// 日本語がバイトの途中で分かれると文字化けする。それは問題10で直す。
import net from 'node:net';

const port = Number(process.argv[2] ?? 7100);
let count = 0;

const server = net.createServer((socket) => {
  let buffer = ''; // まだ改行が来ていない、途中までの文字

  socket.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // 最後の1つは途中の部分なので、次の 'data' まで残す
    for (const line of lines) {
      count += 1;
      console.log(`${count}: ${line}`);
      socket.write(`受け取りました: ${line}\n`);
    }
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`${port}番で待ち受けています`);
});
