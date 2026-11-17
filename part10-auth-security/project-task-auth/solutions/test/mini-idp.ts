// 第10部の道具: 練習用の小さな OpenID Connect のログインのサーバ（IdP。第54章）
// 成果物のテストが使うコピー（第10部の tools/ から。中身は同じ）。テストの中で起動するので、npm run mail と同じものを別に動かさなくてよい
// 認可コードフロー + PKCE だけを持つ。ID トークンは RS256 で署名し、公開鍵を JWKS で見せる
// 動かし方（~/dev/part10 で）: npm run idp   → http://127.0.0.1:9640
// 中身は読まなくてよい（第54章で、外から見た動きを確かめる）。本番では、こういうものを自分で作らず、実績のあるサービスを使う
import { createHash, generateKeyPairSync, randomBytes, sign, timingSafeEqual } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import express from 'express';

export type IdpClient = { clientId: string; clientSecret: string; redirectUris: string[] };
export type IdpUser = { sub: string; email: string; emailVerified: boolean; name: string };
export type IdpOptions = {
  host?: string;
  port?: number;
  clients?: IdpClient[];
  users?: IdpUser[];
  now?: () => number;
  log?: (line: string) => void;
};

export const DEFAULT_CLIENTS: IdpClient[] = [
  {
    clientId: 'task-app',
    clientSecret: 'dev-only-client-secret',
    // 第54章の「手を動かす」（9647）と、成果物（画面の http://localhost:5173 から、Vite が API へ中継する）
    redirectUris: ['http://127.0.0.1:9647/auth/callback', 'http://localhost:5173/api/auth/idp/callback'],
  },
];

export const DEFAULT_USERS: IdpUser[] = [
  { sub: 'u-1001', email: 'alice@example.com', emailVerified: true, name: 'alice' },
  // bob のメールアドレスは「確認されていない」（第54章 6節）
  { sub: 'u-1002', email: 'bob@example.com', emailVerified: false, name: 'bob' },
];

type CodeRecord = {
  clientId: string;
  redirectUri: string;
  sub: string;
  scope: string[];
  nonce: string | undefined;
  codeChallenge: string;
  expiresAt: number;
  used: boolean;
};

const b64url = (data: Buffer | string) => Buffer.from(data).toString('base64url');
const sha256 = (text: string) => createHash('sha256').update(text).digest();

function escapeHtml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

/** 文字列の比べ方（秘密の値は、時間の差が出ないように比べる） */
function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function startIdp({
  host = '127.0.0.1',
  port = 9640,
  clients = DEFAULT_CLIENTS,
  users = DEFAULT_USERS,
  now = Date.now,
  log,
}: IdpOptions = {}) {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicJwk = publicKey.export({ format: 'jwk' });
  const kid = `dev-${createHash('sha256').update(JSON.stringify(publicJwk)).digest('hex').slice(0, 8)}`;
  const codes = new Map<string, CodeRecord>();
  const accessTokens = new Map<string, { sub: string; scope: string[]; expiresAt: number }>();
  let issuer = '';

  const findClient = (id: unknown) => clients.find((c) => c.clientId === id);
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

  function signJwt(payload: Record<string, unknown>): string {
    const data = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid }))}.${b64url(JSON.stringify(payload))}`;
    return `${data}.${b64url(sign('sha256', Buffer.from(data), privateKey))}`;
  }

  /** 認可のリクエストの確かめ。client_id と redirect_uri がおかしいときは、リダイレクトせずに画面でエラーにする */
  function checkAuthorizeParams(q: Record<string, unknown>) {
    const client = findClient(q.client_id);
    const redirectUri = str(q.redirect_uri);
    if (client === undefined) return { ok: false, fatal: 'client_id が登録されていません' } as const;
    if (redirectUri === undefined || !client.redirectUris.includes(redirectUri)) {
      return { ok: false, fatal: 'redirect_uri が登録されたものと一致しません' } as const;
    }
    const state = str(q.state);
    const scope = (str(q.scope) ?? '').split(' ').filter((s) => s !== '');
    let error: string | undefined;
    if (q.response_type !== 'code') error = 'unsupported_response_type';
    else if (!scope.includes('openid')) error = 'invalid_scope';
    else if (q.code_challenge_method !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(str(q.code_challenge) ?? '')) error = 'invalid_request';
    return { ok: true, client, redirectUri, state, scope, nonce: str(q.nonce), codeChallenge: str(q.code_challenge) ?? '', error } as const;
  }

  function redirectWith(res: express.Response, redirectUri: string, params: Record<string, string | undefined>) {
    const url = new URL(redirectUri);
    for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, v);
    res.redirect(302, url.href);
  }

  const app = express();
  app.disable('x-powered-by');
  app.use(express.urlencoded({ extended: false }));
  app.use((req, res, next) => {
    res.on('finish', () => log?.(`${req.method} ${req.path} → ${res.statusCode}`));
    next();
  });

  app.get('/.well-known/openid-configuration', (_req, res) => {
    res.json({
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      userinfo_endpoint: `${issuer}/userinfo`,
      jwks_uri: `${issuer}/jwks`,
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: ['openid', 'email', 'profile'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    });
  });

  app.get('/jwks', (_req, res) => {
    res.json({ keys: [{ ...publicJwk, kid, alg: 'RS256', use: 'sig' }] });
  });

  // ログインと同意の画面
  app.get('/authorize', (req, res) => {
    const p = checkAuthorizeParams(req.query);
    if (!p.ok) return res.status(400).type('html').send(`<!doctype html><meta charset="utf-8"><h1>エラー</h1><p>${escapeHtml(p.fatal)}</p>`);
    if (p.error !== undefined) return redirectWith(res, p.redirectUri, { error: p.error, state: p.state });
    const hidden = ['response_type', 'client_id', 'redirect_uri', 'scope', 'state', 'nonce', 'code_challenge', 'code_challenge_method']
      .map((k) => {
        const v = str(req.query[k]);
        return v === undefined ? '' : `<input type="hidden" name="${k}" value="${escapeHtml(v)}">`;
      })
      .join('');
    const buttons = users
      .map((u) => `<button name="user" value="${escapeHtml(u.sub)}">${escapeHtml(u.name)}（${escapeHtml(u.email)}）としてログイン</button>`)
      .join(' ');
    res.type('html').send(
      `<!doctype html><html lang="ja"><meta charset="utf-8"><title>mini IdP</title>` +
        `<h1>mini IdP（練習用）</h1><p><b>${escapeHtml(p.client.clientId)}</b> が、あなたの ${escapeHtml(p.scope.join('・'))} を求めています。</p>` +
        `<p>練習用なので、パスワードは聞きません。だれとしてログインするか選んでください。</p>` +
        `<form method="post" action="/authorize">${hidden}${buttons} <button name="decision" value="deny">断る</button></form></html>`,
    );
  });

  // 画面のボタン → コードを作って、アプリに戻す
  app.post('/authorize', (req, res) => {
    const body = req.body as Record<string, unknown>;
    const p = checkAuthorizeParams(body);
    if (!p.ok) return res.status(400).type('html').send(`<!doctype html><meta charset="utf-8"><h1>エラー</h1><p>${escapeHtml(p.fatal)}</p>`);
    if (p.error !== undefined) return redirectWith(res, p.redirectUri, { error: p.error, state: p.state });
    if (body.decision === 'deny') return redirectWith(res, p.redirectUri, { error: 'access_denied', state: p.state });
    const user = users.find((u) => u.sub === body.user);
    if (user === undefined) return redirectWith(res, p.redirectUri, { error: 'access_denied', state: p.state });
    const code = b64url(randomBytes(32));
    codes.set(code, {
      clientId: p.client.clientId,
      redirectUri: p.redirectUri,
      sub: user.sub,
      scope: p.scope,
      nonce: p.nonce,
      codeChallenge: p.codeChallenge,
      expiresAt: now() + 60_000, // コードは 60 秒だけ
      used: false,
    });
    redirectWith(res, p.redirectUri, { code, state: p.state });
  });

  // アプリのサーバから呼ばれる: コードを、トークンに取り替える
  app.post('/token', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const body = req.body as Record<string, unknown>;
    const oauthError = (status: number, error: string, description: string) => res.status(status).json({ error, error_description: description });

    // アプリの確かめ: Authorization: Basic base64(id:secret) か、ボディの client_id・client_secret
    let clientId = str(body.client_id);
    let clientSecret = str(body.client_secret);
    const basic = /^Basic (.+)$/i.exec(req.get('Authorization') ?? '');
    if (basic?.[1] !== undefined) {
      const decoded = Buffer.from(basic[1], 'base64').toString();
      const colon = decoded.indexOf(':');
      clientId = decodeURIComponent(decoded.slice(0, colon));
      clientSecret = decodeURIComponent(decoded.slice(colon + 1));
    }
    const client = findClient(clientId);
    if (client === undefined || clientSecret === undefined || !safeEqual(clientSecret, client.clientSecret)) {
      return oauthError(401, 'invalid_client', 'client_id か client_secret が違います');
    }
    if (body.grant_type !== 'authorization_code') return oauthError(400, 'unsupported_grant_type', 'authorization_code だけを受け付けます');
    const code = str(body.code) ?? '';
    const record = codes.get(code);
    if (record === undefined || record.clientId !== client.clientId) return oauthError(400, 'invalid_grant', 'コードが正しくありません');
    if (record.used) {
      // 2回目の利用は、盗まれたかもしれないので、そのコードで出したトークンも取り消す（RFC 6749 4.1.2）
      for (const [token, t] of accessTokens) if (t.sub === record.sub) accessTokens.delete(token);
      return oauthError(400, 'invalid_grant', 'コードはもう使われています');
    }
    record.used = true;
    if (record.expiresAt <= now()) return oauthError(400, 'invalid_grant', 'コードの期限が切れています');
    if (body.redirect_uri !== record.redirectUri) return oauthError(400, 'invalid_grant', 'redirect_uri が認可のときと違います');
    const verifier = str(body.code_verifier) ?? '';
    if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) || !safeEqual(b64url(sha256(verifier)), record.codeChallenge)) {
      return oauthError(400, 'invalid_grant', 'code_verifier が合いません');
    }
    const user = users.find((u) => u.sub === record.sub);
    if (user === undefined) return oauthError(400, 'invalid_grant', 'ユーザーがいません');

    const iat = Math.floor(now() / 1000);
    const accessToken = b64url(randomBytes(32));
    accessTokens.set(accessToken, { sub: user.sub, scope: record.scope, expiresAt: now() + 3600_000 });
    const claims: Record<string, unknown> = { iss: issuer, sub: user.sub, aud: client.clientId, iat, exp: iat + 300 };
    if (record.nonce !== undefined) claims.nonce = record.nonce;
    if (record.scope.includes('email')) Object.assign(claims, { email: user.email, email_verified: user.emailVerified });
    if (record.scope.includes('profile')) claims.name = user.name;
    res.json({ access_token: accessToken, token_type: 'Bearer', expires_in: 3600, scope: record.scope.join(' '), id_token: signJwt(claims) });
  });

  // アクセストークンで、ユーザーの情報を返す
  app.get('/userinfo', (req, res) => {
    const m = /^Bearer (.+)$/.exec(req.get('Authorization') ?? '');
    const t = m?.[1] === undefined ? undefined : accessTokens.get(m[1]);
    if (t === undefined || t.expiresAt <= now()) {
      res.set('WWW-Authenticate', 'Bearer error="invalid_token"');
      return res.status(401).json({ error: 'invalid_token' });
    }
    const user = users.find((u) => u.sub === t.sub);
    if (user === undefined) return res.status(401).json({ error: 'invalid_token' });
    const info: Record<string, unknown> = { sub: user.sub };
    if (t.scope.includes('email')) Object.assign(info, { email: user.email, email_verified: user.emailVerified });
    if (t.scope.includes('profile')) info.name = user.name;
    res.json(info);
  });

  const server = app.listen(port, host);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const actualPort = (server.address() as AddressInfo).port;
  issuer = `http://${host}:${actualPort}`;
  return {
    issuer,
    port: actualPort,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

if (import.meta.main) {
  const port = Number(process.env.IDP_PORT ?? 9640);
  const idp = await startIdp({ port, log: (line) => console.log(line) });
  console.log(`練習用の IdP: ${idp.issuer}`);
  console.log(`設定: ${idp.issuer}/.well-known/openid-configuration`);
  console.log('登録してあるアプリ: client_id=task-app client_secret=dev-only-client-secret');
  console.log('Ctrl+C で止めます');
}
