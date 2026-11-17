// 5節: OpenID Connect でログインするアプリ（認可コードフロー + PKCE）
// 動かし方: node samples/oidc-client.ts   → http://127.0.0.1:9647（先に、別のターミナルで npm run idp）
import { createHash, randomBytes } from 'node:crypto';
import express from 'express';
import session from 'express-session';
import { z } from 'zod';
import { fetchJwks, verifyIdToken } from './id-token.ts';

declare module 'express-session' {
  interface SessionData {
    /** ログインを始めてから、戻ってくるまでの間だけ覚える値 */
    oidc: { state: string; nonce: string; verifier: string };
    user: { sub: string; email: string | undefined; name: string | undefined };
  }
}

const ISSUER = process.env.IDP_ISSUER ?? 'http://127.0.0.1:9640';
const CLIENT_ID = 'task-app';
const CLIENT_SECRET = process.env.CLIENT_SECRET ?? 'dev-only-client-secret';
const REDIRECT_URI = 'http://127.0.0.1:9647/auth/callback';

const TokenResponse = z.object({ id_token: z.string(), access_token: z.string(), token_type: z.string() });
const random = () => randomBytes(32).toString('base64url');

const app = express();
app.use(
  session({
    name: 'sid',
    secret: 'dev-only-session-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' }, // Lax: IdP から戻ってくる GET（ページの移動）には Cookie が付く
  }),
);

app.get('/', (req, res) => {
  const user = req.session.user;
  res.type('html').send(
    user === undefined
      ? '<!doctype html><meta charset="utf-8"><p><a href="/auth/login">mini IdP でログイン</a></p>'
      : `<!doctype html><meta charset="utf-8"><p>ログインしています: ${JSON.stringify(user).replaceAll('<', '\\u003c')}</p>` +
          '<form method="post" action="/auth/logout"><button>ログアウト</button></form>',
  );
});

// 1. ログインを始める: 3つの値を作ってセッションに覚え、IdP へ送り出す
app.get('/auth/login', (req, res) => {
  const oidc = { state: random(), nonce: random(), verifier: random() };
  req.session.oidc = oidc;
  const url = new URL(`${ISSUER}/authorize`);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid email profile',
    state: oidc.state,
    nonce: oidc.nonce,
    code_challenge: createHash('sha256').update(oidc.verifier).digest('base64url'),
    code_challenge_method: 'S256',
  }).toString();
  res.redirect(url.href);
});

// 2. IdP から戻ってくる
app.get('/auth/callback', async (req, res) => {
  const saved = req.session.oidc;
  delete req.session.oidc; // 1回だけ使う
  const { state, code, error } = req.query;
  if (saved === undefined || typeof state !== 'string' || state !== saved.state) {
    return res.status(400).send('ログインをやり直してください（state が合いません）');
  }
  if (typeof error === 'string') return res.status(400).send(`ログインできませんでした: ${error}`);
  if (typeof code !== 'string') return res.status(400).send('ログインをやり直してください（code がありません）');

  let claims: ReturnType<typeof verifyIdToken>;
  try {
    // 3. コードをトークンに取り替える（サーバからサーバへ。client_secret と verifier を見せる）
    const tokenRes = await fetch(`${ISSUER}/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: saved.verifier }),
      signal: AbortSignal.timeout(5000),
    });
    if (!tokenRes.ok) throw new Error(`トークンをもらえません: ${tokenRes.status}`);
    const tokens = TokenResponse.parse(await tokenRes.json());
    // 4. ID トークンを確かめる
    claims = verifyIdToken(tokens.id_token, await fetchJwks(`${ISSUER}/jwks`), { issuer: ISSUER, clientId: CLIENT_ID, nonce: saved.nonce });
  } catch (err) {
    console.error(err);
    return res.status(502).send('ログインできませんでした（IdP とのやり取りに失敗しました）');
  }

  // 5. ログインした状態にする（第52章と同じく、ID を作り直してから）
  req.session.regenerate((err) => {
    if (err) return res.status(500).send('ログインできませんでした');
    req.session.user = { sub: claims.sub, email: claims.email, name: claims.name };
    res.redirect('/');
  });
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.redirect(303, '/');
  });
});

app.listen(9647, '127.0.0.1', () => console.log('http://127.0.0.1:9647'));
