// 練習問題8 の模範解答: HTTP を HTTPS へリダイレクトし、HTTPS 側で HSTS と Secure Cookie を使う
// 使い方: node secure-redirect-server.mjs        HTTP は 127.0.0.1:8080、HTTPS は 127.0.0.1:8443
//   先に bash samples/make-self-signed.sh で ~/dev/ch08/certs に証明書を作っておく
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import crypto from 'node:crypto';

// リダイレクト先は決めておく。Host ヘッダは利用者（攻撃者）が自由に書けるので、そこから作らない
const HTTPS_ORIGIN = 'https://localhost:8443';

// ---- HTTP: すべて HTTPS へ ----
const httpServer = http.createServer((req, res) => {
  console.log(`[http]  ${req.method} ${req.url} → HTTPS へ`);
  res.statusCode = 308; // メソッドとボディを保ったまま移動する
  res.setHeader('Location', HTTPS_ORIGIN + req.url);
  // HSTS はここでは付けない（HTTP のレスポンスの HSTS は、ブラウザに無視される）
  res.end();
});
httpServer.listen(8080, '127.0.0.1', () => {
  console.log('http://localhost:8080/ で待ち受けています（HTTPS へリダイレクトする）');
});

// ---- HTTPS ----
const certDir = `${process.env.HOME}/dev/ch08/certs`;
const options = {
  cert: fs.readFileSync(`${certDir}/cert.pem`),
  key: fs.readFileSync(`${certDir}/key.pem`),
};

const httpsServer = https.createServer(options, (req, res) => {
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    console.log(`[https] ${req.method} ${req.url}`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    // 開発中は短く。問題が無いと分かってから max-age=31536000 などに延ばす
    res.setHeader('Strict-Transport-Security', 'max-age=300');
    if (req.url === '/') {
      const sid = crypto.randomBytes(16).toString('base64url'); // 推測できないランダムな値
      res.setHeader('Set-Cookie', `sid=${sid}; Path=/; Secure; HttpOnly; SameSite=Lax`);
    }
    res.end(`HTTPS で届きました\nメソッド: ${req.method}\nパス: ${req.url}\nボディ: ${body || '（なし）'}\n`);
  });
});
httpsServer.listen(8443, '127.0.0.1', () => {
  console.log('https://localhost:8443/ で待ち受けています');
});
