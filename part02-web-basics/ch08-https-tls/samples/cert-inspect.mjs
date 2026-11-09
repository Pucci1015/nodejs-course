// TLS で接続して、サーバの証明書と接続の内容を表示する（第8章 6節）
// 使い方: node cert-inspect.mjs ホスト名 [ポート] [--ca 証明書ファイル]   既定のポート: 443
//   例: node cert-inspect.mjs example.com
//       node cert-inspect.mjs localhost 8443 --ca ~/dev/ch08/certs/cert.pem
// 検証に失敗しても接続は続け、何が問題だったかを表示する（調べるためのツールなので）。
import tls from 'node:tls';
import net from 'node:net';
import fs from 'node:fs';

const args = process.argv.slice(2);
const caIndex = args.indexOf('--ca');
const caFile = caIndex === -1 ? undefined : args.splice(caIndex, 2)[1];
const [host, portArg] = args;
if (!host) {
  console.error('使い方: node cert-inspect.mjs ホスト名 [ポート] [--ca 証明書ファイル]');
  process.exit(2);
}
const port = Number(portArg ?? 443);

const socket = tls.connect({
  host,
  port,
  // SNI: どのサイトの証明書が欲しいかを伝える。IP アドレスでは送らない決まり（RFC 6066）
  servername: net.isIP(host) ? undefined : host,
  ALPNProtocols: ['h2', 'http/1.1'], // ALPN: 話せる HTTP のバージョンを伝える
  ca: caFile ? [fs.readFileSync(caFile)] : undefined, // 指定しなければ Node.js が持つ認証局の一覧を使う
  rejectUnauthorized: false, // 検証に失敗しても切らない（結果は socket.authorized で分かる）
});

const days = (date) => Math.floor((new Date(date) - Date.now()) / 86_400_000);

socket.setTimeout(5000, () => {
  console.error('時間切れ: 5秒以内に TLS の接続ができませんでした');
  socket.destroy();
  process.exitCode = 2;
});

socket.on('secureConnect', () => {
  console.log(`== 接続 ${host}:${port} ==`);
  console.log(`TLS のバージョン: ${socket.getProtocol()}`);
  console.log(`暗号の組み合わせ: ${socket.getCipher().name}`);
  console.log(`ALPN で決まったもの: ${socket.alpnProtocol || 'なし'}`);
  console.log(`検証の結果: ${socket.authorized ? 'OK（信頼できる証明書）' : `NG（${socket.authorizationError}）`}`);

  // getPeerCertificate(true) は、issuerCertificate で発行者をたどれる形で証明書を返す
  console.log('\n== 証明書のチェーン（サーバの証明書 → 発行者 → …）==');
  let cert = socket.getPeerCertificate(true);
  const seen = new Set();
  let level = 0;
  while (cert && Object.keys(cert).length > 0 && !seen.has(cert.fingerprint256)) {
    seen.add(cert.fingerprint256);
    const indent = '  '.repeat(level);
    console.log(`${indent}[${level}] 持ち主: ${cert.subject?.CN ?? JSON.stringify(cert.subject)}${cert.subject?.O ? `（${cert.subject.O}）` : ''}`);
    console.log(`${indent}    発行者: ${cert.issuer?.CN ?? JSON.stringify(cert.issuer)}${cert.issuer?.O ? `（${cert.issuer.O}）` : ''}`);
    if (cert.subjectaltname) console.log(`${indent}    使える名前（SAN）: ${cert.subjectaltname}`);
    console.log(`${indent}    有効期間: ${new Date(cert.valid_from).toISOString()} 〜 ${new Date(cert.valid_to).toISOString()}（残り ${days(cert.valid_to)} 日）`);
    console.log(`${indent}    公開鍵: ${cert.asn1Curve ? `EC ${cert.asn1Curve}` : cert.bits ? `RSA ${cert.bits} ビット` : '不明'}`);
    console.log(`${indent}    SHA-256 フィンガープリント: ${cert.fingerprint256}`);
    cert = cert.issuerCertificate; // 自己署名の証明書（ルート）では、自分自身を指す
    level += 1;
  }
  socket.end();
});

socket.on('error', (err) => {
  console.error(`接続できません（${err.code ?? err.message}）`);
  process.exitCode = 2;
});
