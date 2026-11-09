// リダイレクトを返すサーバ（第7章 4節で書くものの完成形）
// 使い方: node redirect-server.mjs        curl -i http://127.0.0.1:8103/old
import http from 'node:http';

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  if (req.url === '/old') {
    res.statusCode = 301; // 恒久的に移動した
    res.setHeader('Location', '/new');
    res.end('/new に移動しました\n');
  } else if (req.url === '/new') {
    res.end('新しいページです\n');
  } else if (req.method === 'POST' && req.url === '/memo') {
    res.statusCode = 303; // 結果は別の URL を GET で見て
    res.setHeader('Location', '/done');
    res.end();
  } else if (req.url === '/done') {
    res.end('保存しました\n');
  } else {
    res.statusCode = 404;
    res.end('見つかりません\n');
  }
});

server.listen(8103, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8103/ で待ち受けています');
});
