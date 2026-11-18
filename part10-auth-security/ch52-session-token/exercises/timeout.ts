// 第52章 練習問題7: 使っていない時間と、ログインしてからの時間で、セッションを終わらせる（本文4節）
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

export function checkTimes(times: Times, now: number, limits: Limits): TimeState {
  // ここを書く
  throw new Error(`まだ書いていません: ${JSON.stringify({ times, now, limits })}`);
}

export function sessionTimeouts({ idleMs, absoluteMs, now = Date.now }: Limits & { now?: () => number }): RequestHandler {
  return (_req, _res, _next) => {
    // ここを書く
    void now;
    throw new Error(`まだ書いていません: ${idleMs} ${absoluteMs}`);
  };
}
