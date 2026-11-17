// 第52章 練習問題6 の模範解答: JWT を確かめて、失敗の理由を Result 型で返す（本文6・7節）
import { createHmac, timingSafeEqual } from 'node:crypto';

export type JwtError = 'malformed' | 'alg' | 'signature' | 'expired' | 'not_yet_valid' | 'claim';
export type VerifyResult = { ok: true; claims: Record<string, unknown> } | { ok: false; error: JwtError };
export type VerifyOptions = { now?: number; issuer?: string; audience?: string; leewaySec?: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 練習問題2 の decodePart と同じ */
function decodePart(text: string): Record<string, unknown> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text) || text.length % 4 === 1) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(text, 'base64url').toString('utf8'));
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

export function verifyJwt(token: string, secret: string, options: VerifyOptions = {}): VerifyResult {
  const { now = Date.now(), issuer, audience, leewaySec = 0 } = options;
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, error: 'malformed' };
  const [h = '', p = '', s = ''] = parts;
  const header = decodePart(h);
  const claims = decodePart(p);
  if (header === null || claims === null || !/^[A-Za-z0-9_-]+$/.test(s)) return { ok: false, error: 'malformed' };

  // alg はこちらが決める。ヘッダに書かれた値は「合っているか」を見るだけ
  if (header.alg !== 'HS256') return { ok: false, error: 'alg' };

  const expected = createHmac('sha256', secret).update(`${h}.${p}`).digest();
  const actual = Buffer.from(s, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return { ok: false, error: 'signature' };

  // ここから下は、署名が合った（こちらが作った）中身だけを見る
  const nowSec = Math.floor(now / 1000);
  if (typeof claims.exp !== 'number') return { ok: false, error: 'claim' };
  if (claims.exp + leewaySec <= nowSec) return { ok: false, error: 'expired' };
  if (claims.nbf !== undefined) {
    if (typeof claims.nbf !== 'number') return { ok: false, error: 'claim' };
    if (claims.nbf - leewaySec > nowSec) return { ok: false, error: 'not_yet_valid' };
  }
  if (issuer !== undefined && claims.iss !== issuer) return { ok: false, error: 'claim' };
  if (audience !== undefined) {
    const aud = claims.aud;
    const okAud = aud === audience || (Array.isArray(aud) && aud.includes(audience));
    if (!okAud) return { ok: false, error: 'claim' };
  }
  return { ok: true, claims };
}
