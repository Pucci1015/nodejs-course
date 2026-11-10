// 練習問題8: ログインのあるサイト。セッションの扱いにバグがたくさんあります
// 確かめる: bash check-login.sh
// 使い方: node buggy-login.mjs   → ブラウザで http://127.0.0.1:9225/
//   ユーザー: alice / dev-only-password、bob / another-dev-password（この練習用のもの）
import crypto from 'node:crypto';
import http from 'node:http';
import { html } from '../../ch21-html-templates/samples/mini-html.mjs';

const PORT = Number(process.env.PORT ?? 9225);
const TTL_MS = Number(process.env.SESSION_TTL_MS ?? 30 * 60 * 1000);

const users = { alice: 'dev-only-password', bob: 'another-dev-password' };
const sessions = {};
let nextId = 1;

function parseCookies(header = '') {
  return Object.fromEntries(header.split('; ').filter(Boolean).map((p) => p.split('=')));
}

function readForm(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 10_000) req.destroy(); });
    req.on('end', () => resolve(new URLSearchParams(body)));
    req.on('error', reject);
  });
}

function send(res, status, type, body, sid, extra = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body), 'Set-Cookie': `sid=${sid}; Path=/`, ...extra });
  res.end(body);
}

const page = (s, title, body) => String(html`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${title}</title></head><body>
${s.flash ? html`<p class="flash">${s.flash}</p>` : null}
${body}
</body></html>`);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(`http://localhost${req.url}`);
    let sid = parseCookies(req.headers.cookie).sid;
    if (!sid) sid = String(nextId++);
    sessions[sid] ??= { csrf: crypto.randomBytes(16).toString('hex') };
    const s = sessions[sid];
    console.log(req.method, url.pathname, `sid=${sid}`);

    if (req.method === 'GET' && url.pathname === '/') {
      return send(res, 200, 'text/html; charset=utf-8', page(s, 'トップ', s.user
        ? html`<h1>${s.user} さん、こんにちは</h1><form method="post" action="/logout"><input type="hidden" name="csrf" value="${s.csrf}"><button>ログアウト</button></form>`
        : html`<h1>ログインしていません</h1><p><a href="/login">ログインする</a></p>`), sid);
    }
    if (req.method === 'GET' && url.pathname === '/login') {
      return send(res, 200, 'text/html; charset=utf-8', page(s, 'ログイン', html`<h1>ログイン</h1>
<form method="post" action="/login">
  <input type="hidden" name="csrf" value="${s.csrf}">
  <p><label>ユーザー名 <input name="name" required></label></p>
  <p><label>パスワード <input name="password" type="password" required></label></p>
  <p><button>ログイン</button></p>
</form>`), sid);
    }
    if (req.method === 'POST' && url.pathname === '/login') {
      const form = await readForm(req);
      const name = form.get('name');
      if (!(name in users)) {
        s.flash = 'そのユーザーはいません';
        return send(res, 303, 'text/plain', '', sid, { Location: '/login' });
      }
      if (users[name] !== form.get('password')) {
        s.flash = 'パスワードが違います';
        return send(res, 303, 'text/plain', '', sid, { Location: '/login' });
      }
      s.user = name;
      s.flash = 'ログインしました';
      return send(res, 303, 'text/plain', '', sid, { Location: '/' });
    }
    if (req.method === 'POST' && url.pathname === '/logout') {
      await readForm(req);
      res.writeHead(303, { Location: '/login', 'Set-Cookie': 'sid=; Path=/; Max-Age=0', 'Content-Length': 0 });
      return res.end();
    }
    if (req.method === 'GET' && url.pathname === '/me') {
      if (!s.user) return send(res, 401, 'application/json', JSON.stringify({ error: 'ログインしていません' }), sid);
      return send(res, 200, 'application/json', JSON.stringify({ name: s.user }), sid);
    }
    send(res, 404, 'text/plain; charset=utf-8', 'ありません\n', sid);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500).end();
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（セッションの期限 ${TTL_MS}ms）`));
