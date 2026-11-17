// 第52章 練習問題5 の模範解答: Origin が無いときは Referer で確かめる（本文5節）
import type { RequestHandler } from 'express';

export type FromHeaders = { origin?: string | undefined; referer?: string | undefined };

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isAllowedRequest(method: string, headers: FromHeaders, allowed: readonly string[]): boolean {
  if (SAFE.has(method.toUpperCase())) return true;
  // Origin があれば、それだけで決める（"null" は allowed に入っていないので断られる）
  if (headers.origin !== undefined) return allowed.includes(headers.origin);
  if (headers.referer === undefined) return false;
  // Referer は URL 全体なので、オリジンの部分だけを取り出す。URL でなければ断る
  try {
    return allowed.includes(new URL(headers.referer).origin);
  } catch {
    return false;
  }
}

export function requireSameOrigin(allowed: readonly string[]): RequestHandler {
  return (req, res, next) => {
    if (isAllowedRequest(req.method, { origin: req.get('Origin'), referer: req.get('Referer') }, allowed)) {
      next();
      return;
    }
    res.status(403).json({ detail: 'このサイトからのリクエストは受け付けません' });
  };
}
