// 第60章 7.1節: いちばん小さなリバースプロキシ（PaaS やロードバランサの代わり）
// 9808 で受けて、9807 のアプリへ渡す。そのとき X-Forwarded-For・X-Forwarded-Proto・X-Forwarded-Host を付ける
// 動かし方（章のフォルダで）: node samples/proxy.ts
//   本物の PaaS では、ここで HTTPS を終わらせる（第62章）。この練習では「https で来た」ことにして Proto に https と書く
import http from 'node:http';

const server = http.createServer((req, res) => {
  const clientIp = req.socket.remoteAddress ?? '';
  // 前に届いた X-Forwarded-For があれば、その後ろに、今の相手を足す（客, プロキシ1, プロキシ2, … の順）
  const prior = req.headers['x-forwarded-for'];
  const xff = prior === undefined ? clientIp : `${String(prior)}, ${clientIp}`;
  const upstream = http.request(
    {
      host: '127.0.0.1',
      port: 9807,
      method: req.method,
      path: req.url,
      headers: {
        ...req.headers,
        'x-forwarded-for': xff,
        'x-forwarded-proto': 'https',
        'x-forwarded-host': req.headers.host ?? '',
      },
    },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on('error', () => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' }).end('アプリにつながりません\n');
  });
  req.pipe(upstream);
});

server.listen(9808, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9808/ で受けて、http://127.0.0.1:9807/ へ渡します');
});
