// 6節: JWT（HS256）を、node:crypto だけで作る・確かめる
// 本物のアプリでは、jose などのよく使われているライブラリを使う。ここでは、中で何をしているかを見るために自分で書く
import { createHmac, timingSafeEqual } from 'node:crypto';

/** 1つ目（ヘッダ）と2つ目（中身）は、ただの base64url の JSON。だれでも読める */
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

function signature(data: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(data).digest();
}

/** 中身に、発行した時刻（iat）と期限（exp）を足して、署名した文字列を作る */
export function signJwt(payload: Record<string, unknown>, secret: string, { expiresInSec = 900, now = Date.now() } = {}) {
  const iat = Math.floor(now / 1000);
  const data = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ ...payload, iat, exp: iat + expiresInSec })}`;
  return `${data}.${signature(data, secret).toString('base64url')}`;
}

/** 確かめた中身を返す。おかしければ例外を投げる */
export function verifyJwt(token: string, secret: string, { now = Date.now() } = {}): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('JWT の形ではありません');
  const [h = '', p = '', s = ''] = parts;
  const header: unknown = JSON.parse(Buffer.from(h, 'base64url').toString());
  // ヘッダの alg は、送ってきた人が書いたもの。信じずに、こちらが決めた HS256 だけを受け付ける
  if (typeof header !== 'object' || header === null || !('alg' in header) || header.alg !== 'HS256') {
    throw new Error('alg が HS256 ではありません');
  }
  const expected = signature(`${h}.${p}`, secret);
  const actual = Buffer.from(s, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('署名が合いません');
  const payload: unknown = JSON.parse(Buffer.from(p, 'base64url').toString());
  if (typeof payload !== 'object' || payload === null) throw new Error('中身がオブジェクトではありません');
  const claims = payload as Record<string, unknown>;
  if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(now / 1000)) throw new Error('期限が切れています');
  return claims;
}
