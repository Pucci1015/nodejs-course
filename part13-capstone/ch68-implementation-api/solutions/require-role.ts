// 第68章 練習問題6 の模範解答: 役割を選べる requireRole
// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- req.user の宣言（.d.ts）は import できないので、この書き方で読む
/// <reference path="../exercises/express-user.d.ts" />
import type { RequestHandler } from 'express';
import type { Role } from '../exercises/domain/booking-rules.ts';
import { HttpProblem } from '../exercises/http-problem.ts';

export const ROLE_NAMES = { member: '会員', admin: '管理者' } satisfies Record<Role, string>;

export function requireRole(...roles: Role[]): RequestHandler {
  // 作るときに1回だけ確かめる。リクエストのたびではなく、起動したときに書き間違いが分かる
  if (roles.length === 0) throw new Error('requireRole には役割を1つ以上書いてください');
  const detail = `${roles.map((r) => ROLE_NAMES[r]).join('・')}だけが使えます`;
  return (req, _res, next) => {
    if (req.user === undefined) return next(new HttpProblem(401, 'ログインしてください'));
    if (!roles.includes(req.user.role)) return next(new HttpProblem(403, detail));
    next();
  };
}
