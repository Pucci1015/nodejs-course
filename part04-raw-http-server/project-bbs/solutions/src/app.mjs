// 掲示板のアプリ本体。URL ごとの処理（第18章の Router）
import crypto from 'node:crypto';
import path from 'node:path';
import { createApp, HttpError } from './lib/http-app.mjs';
import { sendHtml, sendJson, redirect } from './lib/send.mjs';
import { Router } from './lib/router.mjs';
import { readForm } from './lib/body.mjs';
import { serveStatic } from './lib/static.mjs';
import { withSession, newSessionId } from './lib/session.mjs';
import { paginate } from './lib/pagination.mjs';
import { hashPassword, verifyPassword } from './auth.mjs';
import { validateSignup, validateThread, validatePost, normalizeNewlines } from './validate.mjs';
import * as views from './views.mjs';

const PER_PAGE = 20;
const FORM_LIMIT = 16 * 1024; // 本文 2000 文字（UTF-8 で最大 8000 バイトほど）と、%xx に直したぶんが入る大きさ

// どのレスポンスにも付けるヘッダ（第19章 nosniff、第21章 8節の CSP）
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
};

/**
 * @param {{ store: import('./store.mjs').Store, sessions: import('./lib/session.mjs').SessionStore, publicDir: string, logger?: object }} options
 */
export function createBbsApp({ store, sessions, publicDir, logger = console }) {
  // ---- セッションまわりの小さな道具
  const currentUser = (req) => (req.session.userId ? store.findUser(req.session.userId) : null);
  const csrfToken = (req) => (req.session.csrf ??= newSessionId());
  function takeFlash(req) {
    const f = req.session.flash;
    delete req.session.flash;
    return f;
  }

  function checkCsrf(req, form) {
    const given = Buffer.from(form.get('csrf') ?? '');
    const expected = Buffer.from(req.session.csrf ?? '');
    if (expected.length === 0 || given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
      throw new HttpError(403, 'フォームが古いか、別のページから送られました。ページを開き直してください');
    }
  }

  // POST のフォームを読み、CSRF を確かめる
  async function readPostForm(req) {
    const form = await readForm(req, { limit: FORM_LIMIT });
    checkCsrf(req, form);
    return form;
  }

  function requireUser(req) {
    const user = currentUser(req);
    if (!user) throw new HttpError(401, 'ログインしてください');
    return user;
  }

  // 画面を返す。layout には、いつもログインの状態・CSRF トークン・flash を渡す
  function render(req, res, status, title, body) {
    const user = currentUser(req);
    // CSRF トークンは、ログアウトのボタンを出すとき（ログインしているとき）だけ。見に来ただけの客にセッションを作らない
    const page = views.layout({ title, body, user, csrf: user ? csrfToken(req) : null, flash: takeFlash(req) });
    sendHtml(res, status, String(page));
  }

  const toId = (s) => (/^[1-9][0-9]{0,9}$/.test(s) ? Number(s) : null); // 「1」「23」だけ。「01」「1e3」は無い id
  function findThread(id) {
    const thread = toId(id) && store.getThread(toId(id));
    if (!thread) throw new HttpError(404, 'そのスレッドはありません');
    return thread;
  }

  const router = new Router()
    // ---- 一覧
    .get('/', (req, res) => {
      const page = paginate(store.listThreads(), { page: req.query.get('page') ?? 1, perPage: PER_PAGE });
      render(req, res, 200, 'スレッドの一覧', views.threadListPage({ page, user: currentUser(req) }));
    })

    // ---- 登録・ログイン・ログアウト
    .get('/signup', (req, res) => render(req, res, 200, '登録', views.signupPage({ csrf: csrfToken(req) })))
    .post('/signup', async (req, res) => {
      const form = await readPostForm(req);
      const values = { name: (form.get('name') ?? '').trim(), password: form.get('password') ?? '' };
      const errors = validateSignup(values);
      let user = null;
      if (Object.keys(errors).length === 0) {
        const { salt, hash } = await hashPassword(values.password);
        user = await store.addUser({ name: values.name, salt, hash });
        if (!user) errors.name = 'その名前は使われています';
      }
      if (!user) return render(req, res, 422, '登録', views.signupPage({ csrf: csrfToken(req), values, errors }));
      req.regenerateSession(); // ログインしたら ID を新しくする（第22章 6.2節）
      req.session.userId = user.id;
      req.session.flash = `${user.name} さん、ようこそ`;
      redirect(res, '/', 303);
    })
    .get('/login', (req, res) => render(req, res, 200, 'ログイン', views.loginPage({ csrf: csrfToken(req) })))
    .post('/login', async (req, res) => {
      const form = await readPostForm(req);
      const name = (form.get('name') ?? '').trim();
      const user = store.findUserByName(name);
      if (!(await verifyPassword(user, form.get('password') ?? ''))) {
        req.session.flash = '名前かパスワードが違います'; // どちらが違うかは言わない（第22章 6.4節）
        return redirect(res, '/login', 303);
      }
      req.regenerateSession();
      req.session.userId = user.id;
      req.session.flash = 'ログインしました';
      redirect(res, '/', 303);
    })
    .post('/logout', async (req, res) => {
      await readPostForm(req);
      req.destroySession(); // サーバからも消す（第22章 6.3節）
      redirect(res, '/', 303);
    })

    // ---- スレッド
    .get('/threads/new', (req, res) => {
      if (!currentUser(req)) {
        req.session.flash = 'スレッドを立てるには、ログインしてください';
        return redirect(res, '/login', 303);
      }
      render(req, res, 200, 'スレッドを立てる', views.newThreadPage({ csrf: csrfToken(req) }));
    })
    .post('/threads', async (req, res) => {
      const form = await readPostForm(req);
      const user = requireUser(req);
      const values = { title: (form.get('title') ?? '').trim(), body: normalizeNewlines(form.get('body') ?? '') };
      const errors = validateThread(values);
      if (Object.keys(errors).length > 0) {
        return render(req, res, 422, 'スレッドを立てる', views.newThreadPage({ csrf: csrfToken(req), values, errors }));
      }
      const { thread } = await store.addThread({ userId: user.id, ...values });
      redirect(res, `/threads/${thread.id}`, 303);
    })
    .get('/threads/:id', (req, res, { id }) => {
      const thread = findThread(id);
      const user = currentUser(req);
      render(req, res, 200, thread.title, views.threadPage({ thread, user, csrf: user ? csrfToken(req) : null }));
    })
    .post('/threads/:id/posts', async (req, res, { id }) => {
      const form = await readPostForm(req);
      const user = requireUser(req);
      const thread = findThread(id);
      const values = { body: normalizeNewlines(form.get('body') ?? '') };
      const errors = validatePost(values);
      if (Object.keys(errors).length > 0) {
        return render(req, res, 422, thread.title, views.threadPage({ thread, user, csrf: csrfToken(req), values, errors }));
      }
      const post = await store.addPost({ threadId: thread.id, userId: user.id, body: values.body });
      redirect(res, `/threads/${thread.id}#post-${post.id}`, 303);
    })
    .post('/posts/:id/delete', async (req, res, { id }) => {
      await readPostForm(req);
      const user = requireUser(req);
      const post = toId(id) && store.getPost(toId(id));
      if (!post) throw new HttpError(404, 'その投稿はありません');
      if (post.userId !== user.id) throw new HttpError(403, '自分の投稿だけを削除できます'); // 認可: だれが何をしてよいか
      await store.deletePost(post.id);
      req.session.flash = '投稿を削除しました';
      redirect(res, `/threads/${post.threadId}`, 303);
    })

    // ---- 読むだけの JSON の API
    .get('/api/threads', (req, res) => {
      sendJson(res, 200, store.listThreads().map(({ id, title, author, postCount, createdAt, updatedAt }) => ({ id, title, author, postCount, createdAt, updatedAt })));
    })
    .get('/api/threads/:id', (req, res, { id }) => {
      const t = findThread(id);
      sendJson(res, 200, {
        id: t.id, title: t.title, author: t.author, createdAt: t.createdAt, updatedAt: t.updatedAt,
        posts: t.posts.map((p) => ({ id: p.id, author: p.author, body: p.deleted ? null : p.body, deleted: p.deleted, createdAt: p.createdAt })),
      });
    })

    // ---- 静的ファイル（第19章）
    .get('/static/*', serveStatic(path.resolve(publicDir), { mount: '/static', cacheControl: 'no-cache' }));

  // HttpError を HTML の画面にする（/api/ と静的ファイルは、createApp の JSON のまま）
  async function handler(req, res) {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    try {
      await router.handle(req, res);
    } catch (err) {
      const isApi = req.pathname?.startsWith('/api/') || req.pathname?.startsWith('/static/');
      if (!(err instanceof HttpError) || isApi || res.headersSent || err.status === 413) throw err;
      if (err.status === 401) {
        req.session.flash = err.message;
        return redirect(res, '/login', 303);
      }
      for (const [k, v] of Object.entries(err.headers)) res.setHeader(k, v);
      render(req, res, err.status, String(err.status), views.errorPage({ status: err.status, message: err.message }));
    }
  }

  return withSession(createApp(handler, { logger }), sessions);
}
