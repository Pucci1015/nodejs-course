// ビルドした画面（web/dist）を、API と同じサーバで配る（第65章 6節、練習問題7の spa-app.ts から）
//   /assets/…  ファイル名にハッシュが入るので、1 年覚えてよい（immutable）。無ければ 404（index.html を返さない）
//   /index.html → / へ 301
//   ほかの、拡張子の無いパス（/rooms/3 など） → index.html（no-cache。毎回確かめさせる）。画面の中の Router が表示を決める
// /api で始まるパスは、ここでは扱わない（API の 404 は problem+json）
import path from 'node:path';
import express, { type ErrorRequestHandler } from 'express';

export function createStaticSite(dir: string): express.Router {
  // res.sendFile は絶対パスしか受け付けないので、STATIC_DIR=web/dist のような相対パスを、今いるフォルダから絶対パスにする
  const distDir = path.resolve(dir);
  const router = express.Router();
  const index = path.join(distDir, 'index.html');

  router.use(
    '/assets',
    express.static(path.join(distDir, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }),
  );

  router.get('/index.html', (_req, res) => {
    res.redirect(301, '/');
  });

  // robots.txt・favicon など、dist の一番上のファイル。名前にハッシュが無いので、毎回確かめさせる
  router.use(express.static(distDir, { index: false, maxAge: 0 }));

  router.get('/{*rest}', (req, res, next) => {
    if (req.path === '/api' || req.path.startsWith('/api/')) return next(); // API の 404 に任せる
    if (path.extname(req.path) !== '') {
      res.status(404).set('Cache-Control', 'no-store').type('text/plain').send('見つかりません\n');
      return;
    }
    res.set('Cache-Control', 'no-cache');
    res.sendFile(index);
  });

  // /assets の中に無いファイル（fallthrough: false の 404）。古いページが、もう無いファイルを読もうとしたとき
  const onError: ErrorRequestHandler = (err: unknown, _req, res, next) => {
    const status = typeof err === 'object' && err !== null && 'status' in err ? err.status : undefined;
    if (status !== 404) return next(err);
    res.status(404).set('Cache-Control', 'no-store').type('text/plain').send('見つかりません\n');
  };
  router.use(onError);
  return router;
}
