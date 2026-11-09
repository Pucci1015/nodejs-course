// TCP が「メッセージの区切りを持たないバイトの流れ」であることを確かめる（第5章 4.3節）
// 使い方: node tcp-stream-demo.mjs
//
// 1つのプログラムの中でサーバとクライアントを動かし、
//   (1) 3回に分けて write した小さなデータが、受信側で何回の 'data' になるか
//   (2) 1回で write した大きなデータ（1MB）が、受信側で何回の 'data' になるか
// を表示する。
import net from 'node:net';

const server = net.createServer((socket) => {
  let events = 0;
  let bytes = 0;
  socket.on('data', (chunk) => {
    events += 1;
    bytes += chunk.length;
    if (chunk.length < 100) {
      console.log(`  受信 ${events} 回目: ${JSON.stringify(chunk.toString())}`);
    }
  });
  socket.on('end', () => {
    console.log(`  → 'data' は合計 ${events} 回、${bytes} バイト`);
    socket.end();
  });
});

function send(port, writes) {
  return new Promise((resolve) => {
    const client = net.connect(port, '127.0.0.1', () => {
      for (const data of writes) client.write(data);
      client.end(); // 送信の終わり（FIN）を伝える
    });
    client.on('close', resolve);
  });
}

server.listen(0, '127.0.0.1', async () => {
  const { port } = server.address(); // 0 を指定すると、空いているポートが自動で選ばれる
  console.log('(1) "hello\\n" "world\\n" "bye\\n" を3回に分けて write');
  await send(port, ['hello\n', 'world\n', 'bye\n']);
  console.log('(2) 1MB のデータを1回で write');
  await send(port, [Buffer.alloc(1024 * 1024, 'a')]);
  server.close();
});
