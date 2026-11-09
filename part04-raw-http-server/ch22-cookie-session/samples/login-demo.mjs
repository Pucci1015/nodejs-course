// ログインとログアウト。セッション ID の作り直し、flash、CSRF トークン（第22章 6〜8節）
// 使い方: node login-demo.mjs   → ブラウザで http://127.0.0.1:9222/
//   ユーザー名 ryota、パスワード dev-only-password でログインできる（この練習用のもの）
import crypto from 'node:crypto';
import http from 'node:http';
import { promisify } from 'node:util';
import { createApp, HttpError } from '../../ch17-minimal-server/solutions/app.mjs';
import { sendHtml, redirect } from '../../ch17-minimal-server/solutions/send.mjs';
import { Router } from '../../ch18-routing/solutions/router.mjs';
import { readForm } from '../../ch20-request-body/solutions/body.mjs';
import { html } from '../../ch21-html-templates/samples/mini-html.mjs';
import { parseCookies, serializeCookie } from './cookie-basic.mjs';

const PORT = 9222;
const TTL_MS = 30 * 60 * 1000;
const scrypt = promisify(crypto.scrypt);

// --- パスワード: そのまま保存せず、salt を付けた scrypt のハッシュだけを持つ（くわしくは第10部 第51章）
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  return { salt, hash: await scrypt(password, salt, 32) };
}
const users = new Map([['ryota', { name: 'ryota', ...(await hashPassword('dev-only-password')) }]]);
const dummy = await hashPassword('dummy'); // 無いユーザーのときも、同じだけ時間をかけるため

async function checkPassword(name, password) {
  const user = users.get(name);
  const { salt, hash } = user ?? dummy;
  const ok = crypto.timingSafeEqual(await scrypt(password, salt, 32), hash);
  return ok && user ? user : null;
}

// --- セッション（練習問題4で、きちんとした SessionStore にする）
const sessions = new Map();
const newId = () => crypto.randomBytes(32).toString('base64url');

function startSession(req, res) {
  const id = parseCookies(req.headers.cookie).sid;
  const s = id && sessions.get(id);
  if (s && s.expires > Date.now()) {
    req.session = s.data;
    req.sessionId = id;
  } else {
    req.session = { csrf: newId() };
    req.sessionId = newId();
  }
  // レスポンスを書く直前に、保存と Set-Cookie をする
  const writeHead = res.writeHead;
  res.writeHead = function (...args) {
    if (req.sessionId) {
      sessions.set(req.sessionId, { data: req.session, expires: Date.now() + TTL_MS });
      this.setHeader('Set-Cookie', serializeCookie('sid', req.sessionId, { maxAge: TTL_MS / 1000 }));
    } else {
      this.setHeader('Set-Cookie', serializeCookie('sid', '', { maxAge: 0 })); // ログアウト: ブラウザからも消す
    }
    this.setHeader('Cache-Control', 'no-store');
    return writeHead.apply(this, args);
  };
}

// ログインした瞬間に、ID を新しくする（ログイン前の ID を、ログイン後に使わせない）
function regenerate(req) {
  sessions.delete(req.sessionId);
  req.sessionId = newId();
  req.session = { csrf: newId() };
}

function destroy(req) {
  sessions.delete(req.sessionId);
  req.sessionId = null;
}

// flash: 次の1回だけ表示する知らせ。読んだら消す
const setFlash = (req, message) => { req.session.flash = message; };
function takeFlash(req) {
  const f = req.session.flash;
  delete req.session.flash;
  return f;
}

// フォームに隠して入れたトークンが、セッションのものと同じか
function checkCsrf(req, form) {
  const given = Buffer.from(form.get('csrf') ?? '');
  const expected = Buffer.from(req.session.csrf ?? '');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) throw new HttpError(403, 'フォームが古いか、別のページから送られました');
}

const page = (req, title, body) => html`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${title}</title></head><body>
${((f) => (f ? html`<p class="flash">${f}</p>` : null))(takeFlash(req))}
${body}
</body></html>`;

const router = new Router()
  .get('/', (req, res) => {
    const user = req.session.user;
    sendHtml(res, 200, String(page(req, 'トップ', user
      ? html`<h1>${user} さん、こんにちは</h1>
<form method="post" action="/logout"><input type="hidden" name="csrf" value="${req.session.csrf}"><button>ログアウト</button></form>`
      : html`<h1>ログインしていません</h1><p><a href="/login">ログインする</a></p>`)));
  })
  .get('/login', (req, res) => {
    sendHtml(res, 200, String(page(req, 'ログイン', html`<h1>ログイン</h1>
<form method="post" action="/login">
  <input type="hidden" name="csrf" value="${req.session.csrf}">
  <p><label>ユーザー名 <input name="name" autocomplete="username" required></label></p>
  <p><label>パスワード <input name="password" type="password" autocomplete="current-password" required></label></p>
  <p><button>ログイン</button></p>
</form>`)));
  })
  .post('/login', async (req, res) => {
    const form = await readForm(req, { limit: 10 * 1024 });
    checkCsrf(req, form);
    const user = await checkPassword(form.get('name') ?? '', form.get('password') ?? '');
    if (!user) {
      // 「ユーザーが無い」と「パスワードが違う」を、同じ言葉にする
      setFlash(req, 'ユーザー名かパスワードが違います');
      return redirect(res, '/login', 303);
    }
    regenerate(req);
    req.session.user = user.name;
    setFlash(req, 'ログインしました');
    redirect(res, '/', 303);
  })
  .post('/logout', async (req, res) => {
    checkCsrf(req, await readForm(req, { limit: 10 * 1024 }));
    destroy(req);
    redirect(res, '/login', 303);
  });

const app = createApp(router.handle);
http.createServer((req, res) => {
  startSession(req, res);
  return app(req, res);
}).listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
