// 遅い客からサーバを守る時間の制限（第17章 8節）
// 使い方: node timeout-demo.mjs
// 自分で立てたサーバ（127.0.0.1:9175）に、わざと少しずつヘッダを送る客を、同じプロセスの中で動かして、
// headersTimeout で切られる様子を見る。ほかのサーバには使わないこと
import http from 'node:http';
import net from 'node:net';

const PORT = 9175;
// connectionsCheckingInterval: 時間切れを確かめる間隔（既定 30000ms）。デモなので短くする
const server = http.createServer({ connectionsCheckingInterval: 200 }, (req, res) => res.end('ok\n'));
server.headersTimeout = 2000; // ヘッダを全部受け取るまでの上限（既定 60000ms）
server.requestTimeout = 5000; // リクエスト全体（ボディを含む）を受け取るまでの上限（既定 300000ms）
server.keepAliveTimeout = 1000; // 次のリクエストが来ない keep-alive の接続を閉じるまで（既定 5000ms）
// 'clientError' のリスナーを書かなければ、Node.js が 408 などを返して接続を閉じる

const t0 = Date.now();
const ms = () => `${String(Date.now() - t0).padStart(5)}ms`;

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`既定の値: headersTimeout=${new http.Server().headersTimeout} requestTimeout=${new http.Server().requestTimeout} keepAliveTimeout=${new http.Server().keepAliveTimeout}`);
  console.log('1. ヘッダを 1 文字ずつ、300ms おきに送る客');
  await new Promise((resolve) => {
    const sock = net.connect(PORT, '127.0.0.1');
    const req = 'GET / HTTP/1.1\r\nHost: localhost\r\nX-Slow: ' + 'a'.repeat(100) + '\r\n\r\n';
    let i = 0;
    const timer = setInterval(() => {
      if (sock.writable) sock.write(req[i++]);
    }, 300);
    sock.on('data', (d) => console.log(`${ms()} 客: 受け取った ${JSON.stringify(d.toString().split('\r\n')[0])}`));
    sock.on('close', () => {
      clearInterval(timer);
      console.log(`${ms()} 客: 接続が閉じられた（送れたのは ${i} 文字）`);
      resolve();
    });
  });
  console.log('2. ふつうの客が1回リクエストして、そのまま接続を開けておく');
  await new Promise((resolve) => {
    const start = Date.now();
    const sock = net.connect(PORT, '127.0.0.1', () => sock.write('GET / HTTP/1.1\r\nHost: localhost\r\n\r\n'));
    sock.on('data', () => {});
    sock.on('close', () => {
      console.log(`${ms()} 客: ${Date.now() - start}ms 後に、サーバが keep-alive の接続を閉じた`);
      resolve();
    });
  });
  server.close();
});
