// Cookie のやりとりを見る（第22章 2・3節）
// 使い方: node cookie-demo.mjs   → ブラウザで http://127.0.0.1:9220/
//   「訪問回数」は Cookie に入れているだけなので、利用者が自由に見て、変えられる
//   DevTools の Application → Cookies で、値と属性を見てください
import http from 'node:http';
import { parseCookies, serializeCookie } from './cookie-basic.mjs';
import { html } from '../../ch21-html-templates/samples/mini-html.mjs';

const PORT = 9220;

const server = http.createServer((req, res) => {
  const url = new URL(`http://localhost${req.url}`);
  const cookies = parseCookies(req.headers.cookie);
  console.log(`${req.method} ${url.pathname}  Cookie: ${req.headers.cookie ?? '（無し）'}`);

  if (url.pathname === '/clear') {
    // 消すときは、同じ名前・同じ Path で Max-Age=0
    res.writeHead(303, { Location: '/', 'Set-Cookie': [serializeCookie('visits', '', { maxAge: 0 }), serializeCookie('theme', '', { maxAge: 0, httpOnly: false })] });
    return res.end();
  }
  if (url.pathname !== '/') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('ありません\n');
  }

  const visits = Number(cookies.visits ?? 0) + 1;
  const setCookies = [
    // HttpOnly: ページの JavaScript（document.cookie）から読めない。30日残す
    serializeCookie('visits', String(visits), { maxAge: 60 * 60 * 24 * 30 }),
    // こちらは HttpOnly を付けない。ページの JavaScript から読める。Max-Age が無いので、ブラウザを閉じると消える
    serializeCookie('theme', 'ダーク', { httpOnly: false }),
  ];
  const body = String(html`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>Cookie</title></head><body>
<h1>${visits} 回目の訪問です</h1>
<p>ブラウザが送ってきた Cookie ヘッダ: <code>${req.headers.cookie ?? '（無し）'}</code></p>
<p>このレスポンスで送った Set-Cookie:</p>
<ul>${setCookies.map((c) => html`<li><code>${c}</code></li>`)}</ul>
<p>ページの JavaScript から見える Cookie（<code>document.cookie</code>）: <code id="js"></code></p>
<p><a href="/">もう一度開く</a> ／ <a href="/clear">Cookie を消す</a></p>
<script>document.getElementById('js').textContent = document.cookie || '（無し）';</script>
</body></html>`);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Set-Cookie': setCookies });
  res.end(body);
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
