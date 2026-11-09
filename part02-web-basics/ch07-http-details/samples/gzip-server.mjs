// 圧縮して返すサーバ（第7章 6節で書くものの完成形）
// 使い方: node gzip-server.mjs        curl -s -o /dev/null -w '%{size_download}\n' -H 'Accept-Encoding: gzip' http://127.0.0.1:8105/big
import http from 'node:http';
import zlib from 'node:zlib';

// 同じ形の行を 1000 行。くり返しが多いので、よく縮む
let big = '';
for (let i = 1; i <= 1000; i++) {
  big += `${i} 行目: 今日の天気は晴れです。\n`;
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Vary', 'Accept-Encoding'); // Accept-Encoding によって中身が変わる、と伝える

  const accept = req.headers['accept-encoding'] ?? '';
  if (accept.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
    res.end(zlib.gzipSync(big));
  } else {
    res.end(big);
  }
});

server.listen(8105, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8105/big で待ち受けています');
});
