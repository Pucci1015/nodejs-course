// 第65章 練習問題7: ビルドした画面（dist）を配る Express のアプリ（本文 6節）
import path from 'node:path';
import express from 'express';

/** distDir の中の index.html と assets/ を配るアプリを作る（listen はしない） */
export function createSpaApp(distDir: string): express.Express {
  const app = express();
  app.disable('x-powered-by');

  // 追加: どの応答にも nosniff（HTML を JS として読ませない。第4部 第19章）
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  app.use('/assets', express.static(path.join(distDir, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }));

  app.use('/api', (_req, res) => {
    res.status(404).setHeader('Cache-Control', 'no-store').json({ title: 'Not Found' });
  });

  // 追加: /index.html は / へ（同じページが 2 つの URL にならないように）
  app.get('/index.html', (_req, res) => {
    res.redirect(301, '/');
  });

  app.use(express.static(distDir, { index: false, maxAge: 0 }));

  app.get('/{*rest}', (req, res) => {
    if (path.extname(req.path) !== '') {
      res.status(404).setHeader('Cache-Control', 'no-store').type('text/plain').send('見つかりません\n');
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });

  app.use((err: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status ?? 500;
    res.status(status).setHeader('Cache-Control', 'no-store').type('text/plain').send(status === 404 ? '見つかりません\n' : 'エラー\n');
  });
  return app;
}
