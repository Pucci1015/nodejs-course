// 第51章 練習問題8: 登録・ログイン・パスワードの変更の API（本文5節の auth-api.ts を広げる）
import express from 'express';
import { z } from 'zod';
import { hashPassword, verifyPassword } from './password.ts';
import { checkPassword } from './policy-sample.ts';

export function createAuthApp() {
  const app = express();
  app.use(express.json());
  // ここを書く: POST /api/register・POST /api/login・POST /api/password
  void z;
  void hashPassword;
  void verifyPassword;
  void checkPassword;
  return app;
}
