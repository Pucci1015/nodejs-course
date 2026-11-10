// 練習問題2: Hono で小さなアプリを作ってください。
// 要件は README にあります。
// 確かめ方: node --test hello-hono.test.mjs
import { Hono } from 'hono';

export function createHelloApp() {
  const app = new Hono();
  // ここを書く
  return app;
}
