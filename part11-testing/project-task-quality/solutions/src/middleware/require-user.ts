// 追加（第10部）: ログインしている人を探して req.user に入れる。いなければ 401（第52章 練習問題3 の requireAuth）
import type { RequestHandler } from 'express';
import type { UserRepo } from '../repositories/pg-users.ts';
import { HttpProblem } from './problem.ts';

export function requireUser(users: UserRepo): RequestHandler {
  return async (req, _res, next) => {
    const userId = req.session.userId;
    if (userId === undefined) return next(new HttpProblem(401, { detail: 'ログインしてください' }));
    const user = await users.findById(userId);
    if (user === null) {
      // セッションはあるが、ユーザーが消されていた。セッションも消す
      req.session.destroy(() => next(new HttpProblem(401, { detail: 'ログインしてください' })));
      return;
    }
    req.user = { id: user.id, email: user.email };
    next();
  };
}
