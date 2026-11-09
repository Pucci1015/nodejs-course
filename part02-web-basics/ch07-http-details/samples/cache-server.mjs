// キャッシュの実験をするサーバ（第7章 5節で書くものの完成形）
// 使い方: node cache-server.mjs        ブラウザで http://127.0.0.1:8104/time 、curl -i http://127.0.0.1:8104/news
import http from 'node:http';
import crypto from 'node:crypto';

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url} If-None-Match: ${req.headers['if-none-match'] ?? '（なし）'}`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  if (req.url === '/time') {
    // 10秒間は、サーバに聞かずに保存したものを使ってよい
    res.setHeader('Cache-Control', 'max-age=10');
    res.end(`今は ${new Date().toLocaleTimeString('ja-JP')} です\n`);
  } else if (req.url === '/news') {
    // 中身は30秒ごとに変わる
    const version = Math.floor(Date.now() / 30000);
    const body = `ニュース 第 ${version} 版\n`;
    // 中身のハッシュから ETag を作る。中身が同じなら、いつ作っても同じ ETag になる
    const etag = `"${crypto.createHash('sha256').update(body).digest('hex').slice(0, 16)}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'no-cache'); // 使う前に毎回確認して

    if (req.headers['if-none-match'] === etag) {
      res.statusCode = 304; // 手元のものを使って（ボディは送らない）
      res.end();
    } else {
      res.end(body);
    }
  } else {
    res.statusCode = 404;
    res.end('見つかりません\n');
  }
});

server.listen(8104, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8104/ で待ち受けています');
});
