// 第55章 練習問題7: エラーを受け取るミドルウェア（本文10節の errors.ts を広げる）
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export type ErrorLogEntry = { errorId: string; method: string; path: string; detail: string };
export type ErrorHandlerOptions = { isProduction: boolean; log: (entry: ErrorLogEntry) => void; newId?: () => string };

/** ログに書く前に、秘密を隠す: URL の中のパスワード、Bearer の後のトークン */
export function redact(text: string): string {
  // ここを書く
  throw new Error(`まだ書いていません: ${text}`);
}

export function createErrorHandler(options: ErrorHandlerOptions) {
  const { isProduction, log, newId = randomUUID } = options;
  return (err: unknown, req: Request, res: Response, next: NextFunction) => {
    // ここを書く
    void [isProduction, log, newId, err, req, res, next];
    res.status(500).end();
  };
}
