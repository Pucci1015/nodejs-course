// 第52章 練習問題3 の模範解答: ログインしている人を探して res.locals.user に入れる（本文4節）
import type { RequestHandler } from 'express';
import 'express-session'; // req.session の型を読み込む（下の宣言のマージの相手）

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

export type User = { id: number; email: string };

const UNAUTHORIZED = { detail: 'ログインしてください' };

export function requireAuth(findUser: (id: number) => User | undefined): RequestHandler {
  return (req, res, next) => {
    const id = req.session.userId;
    if (id === undefined) {
      res.status(401).json(UNAUTHORIZED);
      return;
    }
    const user = findUser(id);
    if (user === undefined) {
      // セッションはあるのに、ユーザーがもういない（消された）。セッションを残しておく理由がないので消す
      req.session.destroy((err) => {
        if (err) {
          next(err);
          return;
        }
        res.clearCookie('sid');
        res.status(401).json(UNAUTHORIZED);
      });
      return;
    }
    res.locals.user = user;
    next();
  };
}
