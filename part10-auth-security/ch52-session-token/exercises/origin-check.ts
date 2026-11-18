// 第52章 練習問題5: Origin が無いときは Referer で確かめる（本文5節）
import type { RequestHandler } from 'express';

export type FromHeaders = { origin?: string | undefined; referer?: string | undefined };

export function isAllowedRequest(method: string, headers: FromHeaders, allowed: readonly string[]): boolean {
  // ここを書く
  throw new Error(`まだ書いていません: ${method} ${JSON.stringify(headers)} ${allowed.join(',')}`);
}

export function requireSameOrigin(allowed: readonly string[]): RequestHandler {
  return (_req, _res, _next) => {
    // ここを書く（isAllowedRequest を使う）
    throw new Error(`まだ書いていません: ${allowed.join(',')}`);
  };
}
