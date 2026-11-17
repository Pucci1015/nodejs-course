// 第52章 練習問題7 の模範解答: 使っていない時間と、ログインしてからの時間で、セッションを終わらせる（本文4節）
import type { RequestHandler } from 'express';
import 'express-session'; // req.session の型を読み込む（下の宣言のマージの相手）

declare module 'express-session' {
  interface SessionData {
    userId: number;
    createdAt: number;
    lastSeenAt: number;
  }
}

export type Times = { createdAt: number; lastSeenAt: number };
export type Limits = { idleMs: number; absoluteMs: number };
export type TimeState = 'ok' | 'idle' | 'absolute';

export function checkTimes(times: Times, now: number, { idleMs, absoluteMs }: Limits): TimeState {
  // 両方が切れていたら absolute（使い続けていても、いつかはログインし直してもらう、のほうが強い理由）
  if (now - times.createdAt >= absoluteMs) return 'absolute';
  if (now - times.lastSeenAt >= idleMs) return 'idle';
  return 'ok';
}

export function sessionTimeouts({ idleMs, absoluteMs, now = Date.now }: Limits & { now?: () => number }): RequestHandler {
  return (req, res, next) => {
    // ログインしていないセッションは、見ない
    if (req.session.userId === undefined) {
      next();
      return;
    }
    const t = now();
    const createdAt = req.session.createdAt ?? t;
    const lastSeenAt = req.session.lastSeenAt ?? t;
    if (checkTimes({ createdAt, lastSeenAt }, t, { idleMs, absoluteMs }) !== 'ok') {
      req.session.destroy((err) => {
        if (err) {
          next(err);
          return;
        }
        res.clearCookie('sid');
        res.status(401).json({ detail: 'もう一度ログインしてください' });
      });
      return;
    }
    req.session.createdAt = createdAt;
    req.session.lastSeenAt = t;
    next();
  };
}
