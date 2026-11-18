// 管理者だけを通す（第68章 2節）。requireUser の後ろに置く（req.user が入っている前提）
// 画面でボタンを隠すのは使いやすさのため。守っているのは、ここ（API）
import type { RequestHandler } from 'express';
import { HttpProblem } from './problem.ts';

export function requireAdmin(): RequestHandler {
  return (req, _res, next) => {
    if (req.user === undefined) return next(new HttpProblem(401, { detail: 'ログインしてください' }));
    if (req.user.role !== 'admin') return next(new HttpProblem(403, { detail: '管理者だけが使えます' }));
    next();
  };
}
