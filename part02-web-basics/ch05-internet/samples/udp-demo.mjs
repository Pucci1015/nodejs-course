// UDP でデータグラムを送受信する（第5章 4.4節）
// 使い方: node udp-demo.mjs
// TCP と違い、接続を作らずにいきなり送る。1回の send が1つのメッセージとして届く。
import dgram from 'node:dgram';

const receiver = dgram.createSocket('udp4');
let count = 0;
receiver.on('message', (msg, rinfo) => {
  count += 1;
  console.log(`受信: ${JSON.stringify(msg.toString())}（${rinfo.address}:${rinfo.port} から）`);
  if (count === 3) receiver.close();
});

receiver.bind(0, '127.0.0.1', () => {
  const { port } = receiver.address();
  const sender = dgram.createSocket('udp4');
  let sent = 0;
  for (const text of ['hello', 'world', 'bye']) {
    sender.send(text, port, '127.0.0.1', () => {
      sent += 1;
      if (sent === 3) sender.close();
    });
  }
});
