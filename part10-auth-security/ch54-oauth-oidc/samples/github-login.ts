// 7節: GitHub でログイン（GitHub の OAuth App。OpenID Connect ではなく OAuth 2.0 + GitHub の API）
// 動かし方: GITHUB_CLIENT_ID=… GITHUB_CLIENT_SECRET=… node samples/github-login.ts   → http://127.0.0.1:9647
// GitHub の「Settings → Developer settings → OAuth Apps」で登録し、callback URL を http://127.0.0.1:9647/auth/github/callback にする
import { createHash, randomBytes } from 'node:crypto';
import express from 'express';
import session from 'express-session';
import { z } from 'zod';

// oidc-client.ts と同じフォルダで型を確かめるので、セッションの名前を githubUser にして、ぶつからないようにする
declare module 'express-session' {
  interface SessionData {
    github: { state: string; verifier: string };
    githubUser: { provider: 'github'; sub: string; login: string; email: string | undefined };
  }
}

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
if (CLIENT_ID === undefined || CLIENT_SECRET === undefined) {
  console.error('GITHUB_CLIENT_ID と GITHUB_CLIENT_SECRET を環境変数で渡してください（README の 7節）');
  process.exit(1);
}
const REDIRECT_URI = 'http://127.0.0.1:9647/auth/github/callback';
const random = () => randomBytes(32).toString('base64url');

// GitHub の応答の形（使う所だけ）
const Token = z.object({ access_token: z.string(), token_type: z.string() });
const TokenError = z.object({ error: z.string(), error_description: z.string().optional() });
const GitHubUser = z.object({ id: z.number(), login: z.string() });
const GitHubEmails = z.array(z.object({ email: z.string(), primary: z.boolean(), verified: z.boolean() }));

/** GitHub の API を呼ぶ（User-Agent が無いと断られる） */
async function githubApi(path: string, accessToken: string): Promise<unknown> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'nodejs-course-task-app',
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`GitHub の API の失敗: ${res.status}`);
  return res.json();
}

const app = express();
app.use(
  session({
    name: 'sid',
    secret: 'dev-only-session-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' },
  }),
);

app.get('/', (req, res) => {
  const user = req.session.githubUser;
  res.type('html').send(
    user === undefined
      ? '<!doctype html><meta charset="utf-8"><p><a href="/auth/github">GitHub でログイン</a></p>'
      : `<!doctype html><meta charset="utf-8"><p>ログインしています: ${JSON.stringify(user).replaceAll('<', '\\u003c')}</p>`,
  );
});

app.get('/auth/github', (req, res) => {
  const github = { state: random(), verifier: random() };
  req.session.github = github;
  const url = new URL('https://github.com/login/oauth/authorize');
  url.search = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'read:user user:email', // プロフィールと、メールアドレスの一覧を読む
    state: github.state,
    code_challenge: createHash('sha256').update(github.verifier).digest('base64url'),
    code_challenge_method: 'S256',
  }).toString();
  res.redirect(url.href);
});

app.get('/auth/github/callback', async (req, res) => {
  const saved = req.session.github;
  delete req.session.github;
  const { state, code } = req.query;
  if (saved === undefined || typeof state !== 'string' || state !== saved.state || typeof code !== 'string') {
    return res.status(400).send('ログインをやり直してください');
  }
  try {
    // コードをアクセストークンに取り替える。Accept を付けないと、JSON ではなくフォームの形で返ってくる
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code, redirect_uri: REDIRECT_URI, code_verifier: saved.verifier }),
      signal: AbortSignal.timeout(5000),
    });
    const body: unknown = await tokenRes.json();
    // GitHub は、失敗も 200 で { error: … } を返すことがあるので、ステータスだけで判断しない
    const failed = TokenError.safeParse(body);
    if (failed.success) throw new Error(`GitHub: ${failed.data.error}`);
    const { access_token } = Token.parse(body);

    // GitHub には ID トークンが無い。アクセストークンで API を呼んで、だれかを聞く
    const user = GitHubUser.parse(await githubApi('/user', access_token));
    const emails = GitHubEmails.parse(await githubApi('/user/emails', access_token));
    const primary = emails.find((e) => e.primary && e.verified); // 確認済みの、いちばん使うアドレス

    req.session.regenerate((err) => {
      if (err) return res.status(500).send('ログインできませんでした');
      // sub には、変えられない数の id を使う（login の名前は、本人が変えられる）
      req.session.githubUser = { provider: 'github', sub: String(user.id), login: user.login, email: primary?.email };
      res.redirect('/');
    });
  } catch (err) {
    console.error(err);
    res.status(502).send('GitHub でログインできませんでした');
  }
});

app.listen(9647, '127.0.0.1', () => console.log('http://127.0.0.1:9647'));
