// 第52章 練習問題3: ログインしている人を探して res.locals.user に入れる（本文4節）
import type { RequestHandler } from 'express';
import 'express-session'; // req.session の型を読み込む（下の宣言のマージの相手）

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

export type User = { id: number; email: string };

export function requireAuth(findUser: (id: number) => User | undefined): RequestHandler {
  return (_req, _res, _next) => {
    // ここを書く
    void findUser;
    throw new Error('まだ書いていません');
  };
}
