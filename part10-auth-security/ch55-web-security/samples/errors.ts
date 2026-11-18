// 10節: エラーの中身を、利用者に見せず、ログにだけ書く
// 動かし方: node samples/errors.ts   → curl -s http://127.0.0.1:9657/boom
import { randomUUID } from 'node:crypto';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

/** ログに書く前に、URL の中のパスワードを隠す（第6部 第32章の redactUrl と同じ考え方） */
const redact = (text: string) => text.replace(/(\/\/[^:/@\s]+:)[^@\s]+@/g, '$1***@');

const app = express();

app.get('/boom', () => {
  // わざと、秘密を含むメッセージのエラーを起こす（データベースにつなげなかったつもり）
  throw new Error('データベースにつなげません: postgres://app:dev-only-password@127.0.0.1:5433/taskapi');
});

// エラーを受け取るミドルウェア（引数が4つ）。いちばん最後に置く
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const errorId = randomUUID(); // 利用者に見せる「問い合わせの番号」。ログと結びつける
  const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
  console.error(`[${errorId}] ${redact(detail)}`);
  res.status(500).type('application/problem+json').json({
    title: 'サーバの中でエラーが起きました',
    status: 500,
    errorId,
  });
});

app.listen(9657, '127.0.0.1', () => console.log('http://127.0.0.1:9657'));
