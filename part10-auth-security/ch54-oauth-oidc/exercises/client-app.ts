// 第54章 練習問題8: 設定を IdP から読み、戻り先を覚えるログイン（本文5節の oidc-client.ts を広げる）
import { createHash, randomBytes } from 'node:crypto';
import express from 'express';
import session from 'express-session';
import { z } from 'zod';
import { verifyIdToken } from './id-token.ts';

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
  // ここを書く
  throw new Error(`まだ書いていません: ${String(value)}`);
}

export function createClientApp(config: ClientConfig) {
  // ここを書く: 本文5節の oidc-client.ts をもとに、GET /auth/login・GET /auth/callback・GET /api/me・POST /auth/logout
  void [createHash, z, verifyIdToken, Discovery, Jwks, TokenResponse, random];
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
  void config;
  return app;
}
