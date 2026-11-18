// 5節: Sec-Fetch-Site を見て、別のサイトから来たリクエストを断る（Fetch Metadata）
// 動かし方: node samples/fetch-metadata.ts   → curl で Sec-Fetch-Site を付けて試す
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

/** 別のサイトからのリクエストは、ページの移動（リンクを踏んだ GET）だけを通す */
function rejectCrossSite(req: Request, res: Response, next: NextFunction) {
  const site = req.get('sec-fetch-site');
  // ヘッダが無い: 古いブラウザか、curl のようなブラウザでないもの（Cookie を勝手に付けないので CSRF にならない）
  if (site === undefined) return next();
  // same-origin: 自分のページから / none: アドレスバーに打った・ブックマーク
  if (site === 'same-origin' || site === 'none') return next();
  // same-site（同じサイトの別のオリジン）・cross-site: リンクを踏んだページの移動の GET だけを通す
  if (req.method === 'GET' && req.get('sec-fetch-mode') === 'navigate' && req.get('sec-fetch-dest') === 'document') return next();
  res.status(403).json({ detail: '別のサイトからのリクエストは受け付けません' });
}

const app = express();
app.use(rejectCrossSite);
app.use(express.json());

app.get('/', (_req, res) => {
  res.type('html').send('<!doctype html><meta charset="utf-8"><title>Fetch Metadata</title><p>トップ</p>');
});
app.post('/api/tasks', (req, res) => {
  res.status(201).json({ created: req.body as unknown });
});

app.listen(9657, '127.0.0.1', () => console.log('http://127.0.0.1:9657'));
