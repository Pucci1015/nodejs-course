// 第65章 練習問題7: ビルドした画面（dist）を配る Express のアプリ（本文 6節）
import express from 'express';

/** distDir の中の index.html と assets/ を配るアプリを作る（listen はしない） */
export function createSpaApp(distDir: string): express.Express {
  const app = express();
  // ここを書く
  void distDir;
  return app;
}
