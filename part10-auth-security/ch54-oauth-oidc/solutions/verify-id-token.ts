// 第54章 練習問題5 の模範解答: ID トークンを確かめて、失敗の理由を値で返す（本文4節の verifyIdToken を変える）
import { createPublicKey, verify, type JsonWebKey, type KeyObject } from 'node:crypto';

export type IdTokenError = 'malformed' | 'alg' | 'key' | 'signature' | 'iss' | 'aud' | 'expired' | 'iat' | 'nonce';
export type IdTokenResult = { ok: true; claims: Record<string, unknown> } | { ok: false; error: IdTokenError };
export type IdTokenOptions = { issuer: string; clientId: string; nonce: string; now?: number; leewaySec?: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodePart(text: string): Record<string, unknown> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(text, 'base64url').toString('utf8'));
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

/** 練習問題3 の pickKey と同じ */
function pickKey(keys: readonly JsonWebKey[], kid: unknown): KeyObject | null {
  const usable = keys.filter((k) => k.kty === 'RSA' && (k.use === undefined || k.use === 'sig') && (k.alg === undefined || k.alg === 'RS256'));
  const jwk = kid === undefined ? (usable.length === 1 ? usable[0] : undefined) : usable.find((k) => k.kid === kid);
  if (jwk === undefined) return null;
  try {
    return createPublicKey({ key: jwk, format: 'jwk' });
  } catch {
    return null;
  }
}

export function verifyIdToken(idToken: string, keys: readonly JsonWebKey[], options: IdTokenOptions): IdTokenResult {
  const { issuer, clientId, nonce, now = Date.now(), leewaySec = 60 } = options;
  const parts = idToken.split('.');
  if (parts.length !== 3) return { ok: false, error: 'malformed' };
  const [h = '', p = '', s = ''] = parts;
  const header = decodePart(h);
  const claims = decodePart(p);
  if (header === null || claims === null || !/^[A-Za-z0-9_-]+$/.test(s)) return { ok: false, error: 'malformed' };

  if (header.alg !== 'RS256') return { ok: false, error: 'alg' };
  const key = pickKey(keys, header.kid);
  if (key === null) return { ok: false, error: 'key' };
  if (!verify('sha256', Buffer.from(`${h}.${p}`), key, Buffer.from(s, 'base64url'))) return { ok: false, error: 'signature' };

  // ここから下は、署名が合った中身だけ
  if (claims.iss !== issuer) return { ok: false, error: 'iss' };
  const aud = claims.aud;
  const audList = typeof aud === 'string' ? [aud] : Array.isArray(aud) ? aud : [];
  if (!audList.includes(clientId)) return { ok: false, error: 'aud' };
  // あて先が2つ以上あるときは、azp（このトークンを受け取ったアプリ）が自分であること（OpenID Connect Core 3.1.3.7）
  if (audList.length > 1 && claims.azp !== clientId) return { ok: false, error: 'aud' };
  const nowSec = Math.floor(now / 1000);
  if (typeof claims.exp !== 'number' || claims.exp + leewaySec <= nowSec) return { ok: false, error: 'expired' };
  if (typeof claims.iat !== 'number' || claims.iat - leewaySec > nowSec) return { ok: false, error: 'iat' };
  if (claims.nonce !== nonce) return { ok: false, error: 'nonce' };
  return { ok: true, claims };
}
