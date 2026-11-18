// 第62章 3節: HTTPS を終わらせるプロキシ（PaaS のロードバランサの代わり）
// - https://localhost:9828 で受けて、HTTPS をほどき、http://127.0.0.1:9827 のアプリへ渡す
// - そのとき X-Forwarded-For・X-Forwarded-Proto: https・X-Forwarded-Host を付ける
// - http://localhost:9829 に来たものは、https へ 308 で送り直す
// 動かし方（章のフォルダで）: node samples/tls-proxy.ts    （先に bash samples/make-cert.sh で certs/ を作る）
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';

const target = { host: '127.0.0.1', port: Number(process.env.TARGET_PORT ?? 9827) };

function forward(req: http.IncomingMessage, res: http.ServerResponse) {
  const prior = req.headers['x-forwarded-for'];
  const ip = req.socket.remoteAddress ?? '';
  const upstream = http.request(
    {
      ...target,
      method: req.method,
      path: req.url,
      headers: {
        ...req.headers,
        'x-forwarded-for': prior === undefined ? ip : `${String(prior)}, ${ip}`,
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
}

const tls = { key: fs.readFileSync('certs/key.pem'), cert: fs.readFileSync('certs/cert.pem') };
https.createServer(tls, forward).listen(9828, '127.0.0.1', () => {
  console.log(`https://localhost:9828/ で受けて、http://${target.host}:${target.port}/ へ渡します`);
});

// http で来たら、同じ場所の https へ。308 はメソッドとボディをそのままにして送り直させる
http
  .createServer((req, res) => {
    const hostname = (req.headers.host ?? 'localhost').replace(/:\d+$/, '');
    res.writeHead(308, { location: `https://${hostname}:9828${req.url ?? '/'}` }).end();
  })
  .listen(9829, '127.0.0.1', () => {
    console.log('http://localhost:9829/ に来たものは、https へ送り直します');
  });
