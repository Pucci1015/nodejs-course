// node:https で作る HTTPS のサーバ（第8章 5.3節・7.2節で書くものの完成形）
// 使い方: node my-https-server.mjs        curl --cacert ~/dev/ch08/certs/cert.pem https://localhost:8444/
//   先に bash samples/make-self-signed.sh で ~/dev/ch08/certs に証明書を作っておく
import https from 'node:https';
import fs from 'node:fs';

const certDir = `${process.env.HOME}/dev/ch08/certs`;
const options = {
  cert: fs.readFileSync(`${certDir}/cert.pem`), // 証明書（公開鍵が入っている）
  key: fs.readFileSync(`${certDir}/key.pem`), // 秘密鍵
};

const server = https.createServer(options, (req, res) => {
  console.log(`${req.method} ${req.url}`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Strict-Transport-Security', 'max-age=300'); // 7.2節: 300秒は HTTPS だけで接続して
  res.end(`HTTPS で届きました: ${req.method} ${req.url}\n`);
});

server.listen(8444, '127.0.0.1', () => {
  console.log('https://localhost:8444/ で待ち受けています');
});
