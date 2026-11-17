// 第54章 練習問題8 の模範解答: 設定を IdP から読み、戻り先を覚えるログイン（本文5節の oidc-client.ts を広げる）
import { createHash, randomBytes } from 'node:crypto';
import express from 'express';
import session from 'express-session';
import { z } from 'zod';
import { verifyIdToken } from '../exercises/id-token.ts';

declare module 'express-session' {
  interface SessionData {
    oidc: { state: string; nonce: string; verifier: string; returnTo: string };
    user: { sub: string; email: string | undefined; name: string | undefined };
  }
}

export type ClientConfig = { issuer: string; clientId: string; clientSecret: string; redirectUri: string };

const Discovery = z.object({ issuer: z.string(), authorization_endpoint: z.url(), token_endpoint: z.url(), jwks_uri: z.url() });
const Jwks = z.object({ keys: z.array(z.looseObject({ kid: z.string().optional(), kty: z.string() })) });
const TokenResponse = z.object({ id_token: z.string() });

const random = () => randomBytes(32).toString('base64url');

/** 自分のサイトの中のパスだけを許す（第2部 第9章の safeRedirectPath） */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  return value;
}

export function createClientApp(config: ClientConfig) {
  /** IdP の設定と鍵は、最初に使うときに1回だけ読む（Promise を覚えておけば、同時に来ても1回） */
  let discovered: Promise<{ meta: z.infer<typeof Discovery>; keys: z.infer<typeof Jwks>['keys'] }> | undefined;
  function discover() {
    discovered ??= (async () => {
      const metaRes = await fetch(`${config.issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(5000) });
      const meta = Discovery.parse(await metaRes.json());
      // 設定の issuer が、自分が思っている IdP と同じか（OpenID Connect Discovery 4.3）
      if (meta.issuer !== config.issuer) throw new Error('issuer が違います');
      const jwksRes = await fetch(meta.jwks_uri, { signal: AbortSignal.timeout(5000) });
      return { meta, keys: Jwks.parse(await jwksRes.json()).keys };
    })().catch((err: unknown) => {
      discovered = undefined; // 失敗したら、次にまた読み直す
      throw err;
    });
    return discovered;
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

  app.get('/auth/login', async (req, res) => {
    const { meta } = await discover();
    const oidc = { state: random(), nonce: random(), verifier: random(), returnTo: safeReturnTo(req.query.returnTo) };
    req.session.oidc = oidc;
    const url = new URL(meta.authorization_endpoint);
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: 'openid email profile',
      state: oidc.state,
      nonce: oidc.nonce,
      code_challenge: createHash('sha256').update(oidc.verifier).digest('base64url'),
      code_challenge_method: 'S256',
    }).toString();
    res.redirect(url.href);
  });

  app.get('/auth/callback', async (req, res) => {
    const saved = req.session.oidc;
    delete req.session.oidc;
    const { state, code, error } = req.query;
    if (saved === undefined || typeof state !== 'string' || state !== saved.state) {
      return res.status(400).json({ detail: 'ログインをやり直してください' });
    }
    if (error === 'access_denied') return res.redirect(303, '/?login=denied');
    if (typeof error === 'string' || typeof code !== 'string') return res.status(400).json({ detail: 'ログインできませんでした' });

    let claims: ReturnType<typeof verifyIdToken>;
    try {
      const { meta, keys } = await discover();
      const tokenRes = await fetch(meta.token_endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: config.redirectUri, code_verifier: saved.verifier }),
        signal: AbortSignal.timeout(5000),
      });
      if (!tokenRes.ok) throw new Error(`token: ${tokenRes.status}`);
      const tokens = TokenResponse.parse(await tokenRes.json());
      claims = verifyIdToken(tokens.id_token, keys, { issuer: meta.issuer, clientId: config.clientId, nonce: saved.nonce });
    } catch {
      return res.status(502).json({ detail: 'ログインできませんでした' });
    }
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ detail: 'ログインできませんでした' });
      req.session.user = { sub: claims.sub, email: claims.email, name: claims.name };
      res.redirect(303, saved.returnTo);
    });
  });

  app.get('/api/me', (req, res) => {
    if (req.session.user === undefined) return res.status(401).json({ detail: 'ログインしてください' });
    res.json(req.session.user);
  });

  app.post('/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('sid');
      res.status(204).end();
    });
  });

  return app;
}
