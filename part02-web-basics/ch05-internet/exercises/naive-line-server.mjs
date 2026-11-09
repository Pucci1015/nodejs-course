// 練習問題4 用: 「1回の 'data' が1つのメッセージだ」と思い込んで書いた、うまく動かないサーバ
// 使い方: node naive-line-server.mjs [ポート]   既定: 7100
// 別のターミナルで node ex-sender.mjs を実行し、表示がどう崩れるか確かめる。
import net from 'node:net';

const port = Number(process.argv[2] ?? 7100);
let count = 0;

net
  .createServer((socket) => {
    socket.on('data', (chunk) => {
      count += 1;
      // 末尾の改行を取り除いて、1つのメッセージとして表示する（つもり）
      console.log(`${count}: ${chunk.toString().replace(/\n$/, '')}`);
    });
  })
  .listen(port, '127.0.0.1', () => console.log(`127.0.0.1:${port} で待ち受けています`));
