// 第55章 練習問題2 の模範解答: Sec-Fetch-* で、別のサイトからのリクエストを断る（本文5節の rejectCrossSite を広げる）
import type { Request, Response, NextFunction } from 'express';

export type RequestInfo = { method: string; path: string; site?: string | undefined; mode?: string | undefined; dest?: string | undefined };
export type GuardOptions = { publicPaths?: string[] };

const SAFE_METHODS = new Set(['GET', 'HEAD']);

export function isAllowedRequest(info: RequestInfo, options: GuardOptions = {}): boolean {
  const { method, path, site, mode, dest } = info;
  // ヘッダが無い（古いブラウザ・ブラウザでないもの）、自分のページから、アドレスバーから
  if (site === undefined || site === 'same-origin' || site === 'none') return true;
  // だれが読んでもよい場所は、読むだけ（GET・HEAD）なら、どこからでも
  const isPublic = (options.publicPaths ?? []).some((prefix) => path.startsWith(prefix));
  if (isPublic && SAFE_METHODS.has(method)) return true;
  // 別のサイトのリンクを踏んだ、ページの移動
  return SAFE_METHODS.has(method) && mode === 'navigate' && dest === 'document';
}

export function fetchMetadataGuard(options: GuardOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const info = {
      method: req.method,
      path: req.path,
      site: req.get('sec-fetch-site'),
      mode: req.get('sec-fetch-mode'),
      dest: req.get('sec-fetch-dest'),
    };
    if (isAllowedRequest(info, options)) return next();
    res.status(403).json({ detail: '別のサイトからのリクエストは受け付けません' });
  };
}
