// 4節: ID トークン（RS256 の JWT）を、IdP の公開鍵（JWKS）で確かめる
import { createPublicKey, verify, type JsonWebKey } from 'node:crypto';
import { z } from 'zod';

const Jwks = z.object({ keys: z.array(z.looseObject({ kid: z.string().optional(), kty: z.string() })) });

/** IdP の公開鍵の一覧を取ってくる */
export async function fetchJwks(jwksUri: string) {
  const res = await fetch(jwksUri, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`JWKS を読めません: ${res.status}`);
  return Jwks.parse(await res.json()).keys;
}

export type VerifyIdTokenOptions = { issuer: string; clientId: string; nonce: string; now?: number };

/** 確かめた中身（クレーム）を返す。おかしければ例外 */
export function verifyIdToken(idToken: string, keys: JsonWebKey[], { issuer, clientId, nonce, now = Date.now() }: VerifyIdTokenOptions) {
  const [h = '', p = '', s = '', ...rest] = idToken.split('.');
  if (rest.length > 0 || s === '') throw new Error('JWT の形ではありません');
  const header = z.object({ alg: z.string(), kid: z.string().optional() }).parse(JSON.parse(Buffer.from(h, 'base64url').toString()));

  // 1. 方式は、こちらが決めた RS256 だけ（第52章 7.1節）
  if (header.alg !== 'RS256') throw new Error(`alg が RS256 ではありません: ${header.alg}`);
  // 2. ヘッダの kid（鍵の名前）で、公開鍵を選ぶ
  const jwk = keys.find((k) => k.kid === header.kid && k.kty === 'RSA');
  if (jwk === undefined) throw new Error('鍵が見つかりません');
  // 3. 公開鍵で署名を確かめる（秘密鍵は IdP しか持っていない）
  const ok = verify('sha256', Buffer.from(`${h}.${p}`), createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(s, 'base64url'));
  if (!ok) throw new Error('署名が合いません');

  // 4. 中身を確かめる
  const claims = z
    .looseObject({
      iss: z.string(),
      sub: z.string(),
      aud: z.union([z.string(), z.array(z.string())]),
      exp: z.number(),
      iat: z.number(),
      nonce: z.string().optional(),
      email: z.string().optional(),
      email_verified: z.boolean().optional(),
      name: z.string().optional(),
    })
    .parse(JSON.parse(Buffer.from(p, 'base64url').toString()));
  if (claims.iss !== issuer) throw new Error('iss（発行した IdP）が違います');
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(clientId)) throw new Error('aud（あて先のアプリ）が違います');
  if (claims.exp <= Math.floor(now / 1000)) throw new Error('期限が切れています');
  if (claims.nonce !== nonce) throw new Error('nonce が違います');
  return claims;
}

// 試す: node samples/id-token.ts ID トークン nonce
if (import.meta.main) {
  const [idToken, nonce] = process.argv.slice(2);
  if (idToken === undefined || nonce === undefined) {
    console.error('使い方: node id-token.ts ID トークン nonce');
    process.exit(2);
  }
  const keys = await fetchJwks('http://127.0.0.1:9640/jwks');
  try {
    console.log(verifyIdToken(idToken, keys, { issuer: 'http://127.0.0.1:9640', clientId: 'task-app', nonce }));
  } catch (err) {
    console.log('確かめられません:', err instanceof Error ? err.message : err);
  }
}
