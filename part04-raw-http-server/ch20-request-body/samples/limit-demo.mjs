// 大きすぎるボディを断る（第20章 4節）
// 使い方: node limit-demo.mjs
//   head -c 5000000 /dev/zero > /tmp/big.bin                 （5MB のファイルを作る）
//   curl -s -o /dev/null -w '%{http_code}\n' -H 'Expect:' --data-binary @/tmp/big.bin http://127.0.0.1:9203/keep
//   curl -s -o /dev/null -w '%{http_code}\n' -H 'Expect:' --data-binary @/tmp/big.bin http://127.0.0.1:9203/close
//   サーバのターミナルに、接続を閉じるまでに受け取ったバイト数が出る
import http from 'node:http';

const PORT = 9203;
const LIMIT = 100_000; // 100KB

const server = http.createServer((req, res) => {
  const declared = Number(req.headers['content-length'] ?? 0);
  console.log(`${req.method} ${req.url} Content-Length=${declared}`);
  if (declared > LIMIT) {
    const headers = { 'Content-Type': 'text/plain; charset=utf-8' };
    // /close: 「この返事のあと接続を閉じる」と伝える。/keep: 伝えない
    if (req.url === '/close') headers.Connection = 'close';
    res.writeHead(413, headers);
    res.end(`大きすぎます（上限 ${LIMIT} バイト）\n`);
    return;
  }
  req.resume(); // 小さいボディは、読んで捨てる
  req.on('end', () => res.end('ok\n'));
});

server.on('connection', (socket) => {
  socket.on('close', () => console.log(`  接続を閉じるまでに受け取ったバイト数: ${socket.bytesRead}`));
});
server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
