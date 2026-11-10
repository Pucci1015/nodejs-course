// ボディはチャンクに分かれて届く（第20章 2節）
// 使い方: node body-chunks.mjs
//   自分で立てたサーバ（127.0.0.1:9200）に、同じプロセスの中から「あいう」を2つに分けて送り、
//   チャンクごとに toString するとどうなるかを見る。続けて curl でも試せる:
//   curl -s --data-binary @/usr/share/dict/words http://127.0.0.1:9200/   （Mac に入っている単語の一覧。約 2.4MB）
import http from 'node:http';
import net from 'node:net';

const PORT = 9200;

const server = http.createServer((req, res) => {
  const chunks = [];
  let wrong = '';
  req.on('data', (chunk) => {
    console.log(`  チャンク ${chunks.length + 1}: ${chunk.length} バイト`);
    chunks.push(chunk);
    wrong += chunk.toString('utf8'); // チャンクごとに文字に戻す（まちがい）
  });
  req.on('end', () => {
    const right = Buffer.concat(chunks).toString('utf8'); // 全部つないでから戻す
    if (right.length < 50) {
      console.log(`  チャンクごとに戻す: ${JSON.stringify(wrong)}`);
      console.log(`  つないでから戻す  : ${JSON.stringify(right)}`);
    } else {
      console.log(`  合計 ${Buffer.concat(chunks).length} バイト、チャンク ${chunks.length} 個`);
    }
    res.end('ok\n');
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${PORT}/ で待っています`);
  console.log('「あいう」（9 バイト）を、4 バイトと 5 バイトに分けて送ります');
  const body = Buffer.from('あいう'); // E3 81 82 E3 81 84 E3 81 86
  const sock = net.connect(PORT, '127.0.0.1', () => {
    sock.write(`POST / HTTP/1.1\r\nHost: localhost\r\nContent-Length: ${body.length}\r\nConnection: close\r\n\r\n`);
    sock.write(body.subarray(0, 4)); // 「い」の途中で切る
    setTimeout(() => sock.end(body.subarray(4)), 100);
  });
  sock.resume();
  sock.on('close', () => console.log('（Ctrl+C で止めるまで、curl でも試せます）'));
});
