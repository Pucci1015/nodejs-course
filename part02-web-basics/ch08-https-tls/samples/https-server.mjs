// HTTPS のサーバ（第8章 5節）
// 使い方: node https-server.mjs 証明書 秘密鍵 [ポート]   既定のポート: 8443
//   例: node https-server.mjs ~/dev/ch08/certs/cert.pem ~/dev/ch08/certs/key.pem
//       node https-server.mjs localhost+2.pem localhost+2-key.pem      （mkcert で作ったもの）
//
// node:http2 の allowHTTP1 を使うので、HTTP/2 に対応したクライアントとは HTTP/2 で、
// そうでないクライアントとは HTTP/1.1 で話す。どちらで話したかをレスポンスに書く。
import http2 from 'node:http2';
import fs from 'node:fs';

const [certFile, keyFile, portArg] = process.argv.slice(2);
if (!certFile || !keyFile) {
  console.error('使い方: node https-server.mjs 証明書 秘密鍵 [ポート]');
  process.exit(2);
}
const port = Number(portArg ?? 8443);

const server = http2.createSecureServer(
  {
    cert: fs.readFileSync(certFile),
    key: fs.readFileSync(keyFile),
    allowHTTP1: true, // HTTP/1.1 のクライアント（古い curl など）も受け付ける
  },
  (req, res) => {
    // ここは node:http と同じ書き方ができる（互換 API）
    const tls = req.socket;
    const body = [
      'HTTPS で届きました。',
      `HTTP のバージョン: ${req.httpVersion}`,
      `TLS のバージョン: ${tls.getProtocol?.() ?? '不明'}`,
      `暗号の組み合わせ: ${tls.getCipher?.()?.name ?? '不明'}`,
      `ALPN で決まったもの: ${tls.alpnProtocol || 'なし'}`,
      `SNI で送られた名前: ${tls.servername || 'なし'}`,
      '',
    ].join('\n');
    res.writeHead(200, {
      'content-type': 'text/plain; charset=utf-8',
      // HSTS: 「この先300秒は、このサイトに HTTPS でしか接続しないで」（7節）。開発用に短くしている
      'strict-transport-security': 'max-age=300',
    });
    res.end(body);
    console.log(`${req.method} ${req.url} HTTP/${req.httpVersion}`);
  },
);

server.listen(port, '127.0.0.1', () => console.log(`https://localhost:${port}/ で待ち受けています（Ctrl + C で終了）`));
