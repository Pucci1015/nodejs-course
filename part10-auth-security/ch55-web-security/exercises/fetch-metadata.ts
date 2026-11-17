// 第55章 練習問題2: Sec-Fetch-* で、別のサイトからのリクエストを断る（本文5節の rejectCrossSite を広げる）
import type { Request, Response, NextFunction } from 'express';

export type RequestInfo = { method: string; path: string; site?: string | undefined; mode?: string | undefined; dest?: string | undefined };
export type GuardOptions = { publicPaths?: string[] };

export function isAllowedRequest(info: RequestInfo, options: GuardOptions = {}): boolean {
  // ここを書く
  throw new Error(`まだ書いていません: ${JSON.stringify(info)} ${JSON.stringify(options)}`);
}

export function fetchMetadataGuard(options: GuardOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // ここを書く（isAllowedRequest を使う）
    void [req, res, options];
    next(new Error('まだ書いていません'));
  };
}
