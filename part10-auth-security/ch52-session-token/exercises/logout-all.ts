// 第52章 練習問題8: ほかの端末のセッションも消す（本文8節）
import express from 'express';
import session from 'express-session';
import { z } from 'zod';
import { hashPassword, verifyPassword } from './password.ts';

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

type User = { id: number; email: string; passwordHash: string };

export async function createApp() {
  // 最初から2人を登録しておく
  const users = new Map<number, User>([
    [1, { id: 1, email: 'alice@example.com', passwordHash: await hashPassword('neko-to-inu-to-tori') }],
    [2, { id: 2, email: 'bob@example.com', passwordHash: await hashPassword('inu-to-saru-to-kiji') }],
  ]);
  // セッションの保存場所を自分で作って、session() に渡す（後で store.destroy(ID, コールバック) を呼べるように）
  const store = new session.MemoryStore();

  const app = express();
  app.use(express.json());
  app.use(
    session({
      name: 'sid',
      secret: 'dev-only-session-secret-change-me',
      store,
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax' },
    }),
  );

  // ここを書く: POST /api/login・GET /api/me・POST /api/logout・POST /api/logout-all・POST /api/password
  void users;
  void z;
  void verifyPassword;

  return app;
}
