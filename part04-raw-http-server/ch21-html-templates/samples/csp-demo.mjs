// Content-Security-Policy: ページで動かしてよい JavaScript を決める（第21章 8節）
// 使い方: node csp-demo.mjs   → ブラウザで http://127.0.0.1:9212/ を開き、DevTools の Console を見る
//   2つの <script> のうち、nonce の付いた方だけが動く
import crypto from 'node:crypto';
import http from 'node:http';

const PORT = 9212;

const server = http.createServer((req, res) => {
  // リクエストごとに新しい、推測できない値
  const nonce = crypto.randomBytes(16).toString('base64');
  const body = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>CSP</title></head><body>
<p id="a">nonce の付いた script: まだ動いていません</p>
<p id="b">nonce の無い script: まだ動いていません</p>
<script nonce="${nonce}">document.getElementById('a').textContent = 'nonce の付いた script: 動きました';</script>
<script>document.getElementById('b').textContent = 'nonce の無い script: 動きました';</script>
</body></html>`;
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    // script は、このサイトのファイルと、この nonce の付いたものだけ。object（プラグイン）は使わない
    'Content-Security-Policy': `default-src 'self'; script-src 'self' 'nonce-${nonce}'; object-src 'none'; base-uri 'none'`,
  });
  res.end(body);
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
