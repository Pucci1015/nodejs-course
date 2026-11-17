// 第55章 練習問題7 の模範解答: エラーを受け取るミドルウェア（本文10節の errors.ts を広げる）
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export type ErrorLogEntry = { errorId: string; method: string; path: string; detail: string };
export type ErrorHandlerOptions = { isProduction: boolean; log: (entry: ErrorLogEntry) => void; newId?: () => string };

/** ログに書く前に、秘密を隠す: URL の中のパスワード、Bearer の後のトークン */
export function redact(text: string): string {
  return text.replace(/(\/\/[^:/@\s]+:)[^@\s]+@/g, '$1***@').replace(/(Bearer\s+)[^\s"']+/gi, '$1***');
}

/** 4xx の「利用者に見せてよい」エラーか。body-parser などのエラーは status と expose を持つ */
function clientErrorStatus(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const status = 'status' in err ? err.status : 'statusCode' in err ? err.statusCode : undefined;
  if (typeof status !== 'number' || status < 400 || status > 499) return undefined;
  if ('expose' in err && err.expose === false) return undefined;
  return status;
}

export function createErrorHandler(options: ErrorHandlerOptions) {
  const { isProduction, log, newId = randomUUID } = options;
  return (err: unknown, req: Request, res: Response, next: NextFunction) => {
    // 応答を送り始めた後は、もう別の応答を返せない。Express の既定の処理（接続を閉じる）に任せる
    if (res.headersSent) return next(err);

    const status = clientErrorStatus(err);
    if (status !== undefined) {
      const title = err instanceof Error ? err.message : 'リクエストが正しくありません';
      return res.status(status).type('application/problem+json').json({ title, status });
    }

    const errorId = newId();
    const raw = err instanceof Error ? (err.stack ?? err.message) : String(err);
    log({ errorId, method: req.method, path: req.path, detail: redact(raw) });
    const body: Record<string, unknown> = { title: 'サーバの中でエラーが起きました', status: 500, errorId };
    // 開発のときだけ、何が起きたかを返す（それでも秘密は隠す）
    if (!isProduction) body.detail = redact(err instanceof Error ? err.message : String(err));
    res.status(500).type('application/problem+json').json(body);
  };
}
