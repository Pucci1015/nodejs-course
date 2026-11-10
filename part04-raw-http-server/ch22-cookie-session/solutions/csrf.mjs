// 練習問題3 の模範解答
import crypto from 'node:crypto';

export function newToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function ensureCsrf(session) {
  if (typeof session.csrf !== 'string') session.csrf = newToken();
  return session.csrf;
}

export function checkCsrf(session, sent) {
  if (typeof session.csrf !== 'string' || typeof sent !== 'string') return false;
  const a = Buffer.from(session.csrf);
  const b = Buffer.from(sent);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
