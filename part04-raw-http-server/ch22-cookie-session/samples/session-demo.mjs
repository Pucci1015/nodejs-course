// セッション: Cookie にはランダムな ID だけを入れ、中身はサーバに置く（第22章 4節）
// 使い方: node session-demo.mjs   → ブラウザで http://127.0.0.1:9221/
//   別のブラウザ（またはシークレットウィンドウ）で開くと、別のセッションになる
//   サーバを止めて起動し直すと、セッションはすべて消える（メモリに置いているため）
import crypto from 'node:crypto';
import http from 'node:http';
import { parseCookies, serializeCookie } from './cookie-basic.mjs';
import { html } from '../../ch21-html-templates/samples/mini-html.mjs';

const PORT = 9221;
const TTL_MS = 30 * 60 * 1000; // 最後に使ってから 30 分で切れる
const sessions = new Map(); // ID → { data, expires }

// 推測できない ID: 32 バイト（256 ビット）の乱数を、Cookie に入れやすい base64url に
const newId = () => crypto.randomBytes(32).toString('base64url');

function loadSession(req) {
  const id = parseCookies(req.headers.cookie).sid;
  const s = id && sessions.get(id);
  if (s && s.expires > Date.now()) return { id, data: s.data, isNew: false };
  if (s) sessions.delete(id); // 切れていたら消す
  return { id: newId(), data: {}, isNew: true }; // 知らない ID は使わず、新しく作る
}

const server = http.createServer((req, res) => {
  const session = loadSession(req);
  session.data.count = (session.data.count ?? 0) + 1;
  sessions.set(session.id, { data: session.data, expires: Date.now() + TTL_MS });
  console.log(`${req.method} ${req.url}  sid=${session.id.slice(0, 8)}…  count=${session.data.count}  セッションの数=${sessions.size}`);

  if (req.url !== '/') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('ありません\n');
  }
  const body = String(html`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>セッション</title></head><body>
<h1>このセッションで ${session.data.count} 回目</h1>
<p>Cookie に入っているのは ID だけです: <code>${session.id}</code></p>
<p>回数（${session.data.count}）は、サーバのメモリにあります。</p>
<p><a href="/">もう一度開く</a></p>
</body></html>`);
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store', // 人ごとに違うページは、キャッシュさせない
    'Set-Cookie': serializeCookie('sid', session.id, { maxAge: TTL_MS / 1000 }),
  });
  res.end(body);
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
