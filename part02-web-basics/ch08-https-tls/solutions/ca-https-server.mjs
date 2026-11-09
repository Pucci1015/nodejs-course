// 練習問題9・10 用: make-local-ca.sh で作った証明書を使う HTTPS のサーバ（my-https-server.mjs をコピーして変えたもの）
// 使い方: node ca-https-server.mjs [作成先のフォルダ] [ポート]   既定: ~/dev/ch08/local-ca 8444
import https from 'node:https';
import fs from 'node:fs';

const certDir = process.argv[2] ?? `${process.env.HOME}/dev/ch08/local-ca`;
const port = Number(process.argv[3] ?? 8444);
const options = {
  cert: fs.readFileSync(`${certDir}/server.pem`),
  key: fs.readFileSync(`${certDir}/server-key.pem`),
};

const server = https.createServer(options, (req, res) => {
  console.log(`${req.method} ${req.url}`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Strict-Transport-Security', 'max-age=300');
  res.end(`HTTPS で届きました: ${req.method} ${req.url}\n`);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`https://localhost:${port}/ で待ち受けています（${certDir} の証明書）`);
});
