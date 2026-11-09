// 練習問題5の模範解答: ログインのあるサイトを、問題2〜4の関数と第17〜21章の部品で書き直したもの
// 使い方: node login.mjs   → ブラウザで http://127.0.0.1:9225/
// 確かめる: bash ../exercises/check-login.sh ../solutions/login.mjs
import crypto from 'node:crypto';
import http from 'node:http';
import { promisify } from 'node:util';
import { createApp, HttpError } from '../../ch17-minimal-server/solutions/app.mjs';
import { sendHtml, sendJson, redirect } from '../../ch17-minimal-server/solutions/send.mjs';
import { Router } from '../../ch18-routing/solutions/router.mjs';
import { readForm } from '../../ch20-request-body/solutions/body.mjs';
import { html } from '../../ch21-html-templates/samples/mini-html.mjs';
import { SessionStore, withSession, newSessionId } from './session.mjs';

const PORT = Number(process.env.PORT ?? 9225);
const TTL_MS = Number(process.env.SESSION_TTL_MS ?? 30 * 60 * 1000);
const scrypt = promisify(crypto.scrypt);

// 修正: パスワードをそのまま持たない。salt 付きの scrypt のハッシュだけ
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  return { salt, hash: await scrypt(password, salt, 32) };
}
const users = new Map();
for (const [name, pw] of [['ryota', 'dev-only-password'], ['hanako', 'another-dev-password']]) users.set(name, { name, ...(await hashPassword(pw)) });
const dummy = await hashPassword('dummy');

async function authenticate(name, password) {
  const user = users.get(name);
  const { salt, hash } = user ?? dummy; // 追加: 無いユーザーでも同じ計算をして、かかる時間で区別できないように
  const ok = crypto.timingSafeEqual(await scrypt(password, salt, 32), hash);
  return ok && user ? user : null;
}

const store = new SessionStore({ ttlMs: TTL_MS });
setInterval(() => store.prune(), 60_000).unref(); // 追加: 切れたセッションを、ときどき掃除する

// 追加: CSRF トークン。セッションに1つ持ち、POST のフォームで送られたものと比べる
function csrfToken(req) {
  req.session.csrf ??= newSessionId();
  return req.session.csrf;
}
function checkCsrf(req, form) {
  const given = Buffer.from(form.get('csrf') ?? '');
  const expected = Buffer.from(req.session.csrf ?? '');
  if (expected.length === 0 || given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    throw new HttpError(403, 'フォームが古いか、別のページから送られました');
  }
}

// 修正: flash は読んだら消す（次の1回だけ）
function takeFlash(req) {
  const f = req.session.flash;
  delete req.session.flash;
  return f;
}

const page = (req, title, body) => {
  const flash = takeFlash(req);
  return String(html`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${title}</title></head><body>
${flash ? html`<p class="flash">${flash}</p>` : null}
${body}
</body></html>`);
};

const router = new Router()
  .get('/', (req, res) => {
    const user = req.session.user;
    sendHtml(res, 200, page(req, 'トップ', user
      ? html`<h1>${user} さん、こんにちは</h1><form method="post" action="/logout"><input type="hidden" name="csrf" value="${csrfToken(req)}"><button>ログアウト</button></form>`
      : html`<h1>ログインしていません</h1><p><a href="/login">ログインする</a></p>`));
  })
  .get('/login', (req, res) => {
    sendHtml(res, 200, page(req, 'ログイン', html`<h1>ログイン</h1>
<form method="post" action="/login">
  <input type="hidden" name="csrf" value="${csrfToken(req)}">
  <p><label>ユーザー名 <input name="name" autocomplete="username" required></label></p>
  <p><label>パスワード <input name="password" type="password" autocomplete="current-password" required></label></p>
  <p><button>ログイン</button></p>
</form>`));
  })
  .post('/login', async (req, res) => {
    const form = await readForm(req, { limit: 10 * 1024 });
    checkCsrf(req, form); // 追加
    const user = await authenticate(form.get('name') ?? '', form.get('password') ?? '');
    if (!user) {
      req.session.flash = 'ユーザー名かパスワードが違います'; // 修正: どちらが違うかを言わない
      return redirect(res, '/login', 303);
    }
    req.regenerateSession(); // 追加: ログインしたら ID を新しくする（前の ID と CSRF トークンは捨てる）
    req.session.user = user.name;
    req.session.flash = 'ログインしました';
    redirect(res, '/', 303);
  })
  .post('/logout', async (req, res) => {
    checkCsrf(req, await readForm(req, { limit: 10 * 1024 })); // 追加
    req.destroySession(); // 修正: サーバからも消す
    redirect(res, '/login', 303);
  })
  .get('/me', (req, res) => {
    // withSession が Cache-Control: no-store を付けるのは、セッションに中身があるときだけ。ここは常に付ける
    res.setHeader('Cache-Control', 'no-store');
    if (!req.session.user) throw new HttpError(401, 'ログインしていません');
    sendJson(res, 200, { name: req.session.user });
  });

const server = http.createServer(withSession(createApp(router.handle), store));
server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（セッションの期限 ${TTL_MS}ms）`));
