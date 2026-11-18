// 第65章 5節: ビルドした画面（dist/）を Express で配る。ハッシュ付きのファイルは長く、index.html は毎回確かめる
// 動かし方（章のフォルダで）: node samples/spa-server.ts   → http://127.0.0.1:9856/
import path from 'node:path';
import express from 'express';

const dist = path.join(import.meta.dirname, 'dist');
const app = express();

// 1. ハッシュ付きのファイル: 1年、確かめずに使ってよい。無ければ 404（index.html を返さない）
app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }));

// 2. API は、無ければ JSON の 404（index.html を返さない）
app.use('/api', (_req, res) => {
  res.status(404).json({ title: 'Not Found' });
});

// 3. ほかのファイル（robots.txt など）: 名前が変わらないので、毎回確かめる
app.use(express.static(dist, { index: false, maxAge: 0 }));

// 4. 残りの GET（/tasks/12 など、画面の中の URL）: index.html を返す。拡張子のある名前は 404
app.get('/{*rest}', (req, res) => {
  if (path.extname(req.path) !== '') {
    res.status(404).type('text/plain').send('見つかりません\n');
    return;
  }
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(dist, 'index.html'));
});

// express.static の fallthrough: false が出す 404 などを、短い文で返す
app.use((err: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status ?? 500).type('text/plain').send(err.status === 404 ? '見つかりません\n' : 'エラー\n');
});

app.listen(9856, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9856/ で待っています');
});
