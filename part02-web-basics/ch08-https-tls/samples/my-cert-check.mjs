// TLS で接続して、証明書の持ち主・発行者・期限と、検証の結果を表示する（第8章 6節で書くものの完成形）
// 使い方: node my-cert-check.mjs ホスト名 [ポート] [信頼する証明書のファイル]
//   例: node my-cert-check.mjs localhost 8444 ~/dev/ch08/certs/cert.pem
import tls from 'node:tls';
import fs from 'node:fs';

const host = process.argv[2] ?? 'localhost';
const port = Number(process.argv[3] ?? 443);
const caFile = process.argv[4];

const options = {
  host,
  port,
  servername: host, // SNI: どのサイトの証明書が欲しいか（4節）
  rejectUnauthorized: false, // 検証に失敗しても切らずに、結果を見る（調べるためのツールなので）
};
if (caFile !== undefined) options.ca = fs.readFileSync(caFile); // この証明書を信頼する

const socket = tls.connect(options, () => {
  const cert = socket.getPeerCertificate();
  console.log(`持ち主: ${cert.subject.CN}`);
  console.log(`発行者: ${cert.issuer.CN}`);
  console.log(`期限  : ${cert.valid_to}`);
  console.log(`検証  : ${socket.authorized ? 'OK' : `NG（${socket.authorizationError}）`}`);
  socket.end();
});

socket.on('error', (err) => {
  console.log(`接続できません（${err.code}）`);
});
