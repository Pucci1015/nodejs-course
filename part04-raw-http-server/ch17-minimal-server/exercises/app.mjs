// 練習問題3: ハンドラを包んで、エラー・リクエスト ID・アクセスログをまとめて扱う
// 仕様は README の練習問題3を見てください。
// 確かめる: node --test app.test.mjs
import crypto from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message, { headers = {} } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.headers = headers;
  }
}

export function createApp(handler, { logger = console, now = () => performance.now() } = {}) {
  // ここを書く
  return (req, res) => handler(req, res);
}
