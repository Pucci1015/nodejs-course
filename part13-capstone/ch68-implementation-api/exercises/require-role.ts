// 第68章 練習問題6: 本文の requireAdmin を、役割を選べる requireRole にする（本文 2.3節）
// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- req.user の宣言（.d.ts）は import できないので、この書き方で読む
/// <reference path="./express-user.d.ts" />
import type { RequestHandler } from 'express';
import type { Role } from './domain/booking-rules.ts';
import { HttpProblem } from './http-problem.ts';

/** 役割の、画面に出す名前 */
export const ROLE_NAMES = { member: '会員', admin: '管理者' } satisfies Record<Role, string>;

/**
 * roles のどれかの役割の人だけを通すミドルウェアを返す
 * - ログインしていない（req.user が無い）: 401「ログインしてください」
 * - 役割が合わない: 403「管理者だけが使えます」（文は ROLE_NAMES の名前を「・」でつなぎ「だけが使えます」を付ける）
 * - roles が空: ミドルウェアを作るときに Error を投げる（だれも通れない道は、書き間違い）
 */
export function requireRole(...roles: Role[]): RequestHandler {
  // ここを書く
  void HttpProblem;
  throw new Error(`まだ書いていません（${roles.join(',')}）`);
}
