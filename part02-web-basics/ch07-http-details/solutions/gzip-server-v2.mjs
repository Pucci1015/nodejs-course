// 練習問題8 の模範解答: br（Brotli）にも対応し、br → gzip → 圧縮しない の順に選ぶ
// 使い方: node gzip-server-v2.mjs        curl -s -o /dev/null -w '%{size_download}\n' -H 'Accept-Encoding: br' http://127.0.0.1:8105/big
import http from 'node:http';
import zlib from 'node:zlib';

let big = '';
for (let i = 1; i <= 1000; i++) {
  big += `${i} 行目: 今日の天気は晴れです。\n`;
}

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Vary', 'Accept-Encoding');

  const accept = req.headers['accept-encoding'] ?? '';
  let encoding = 'identity';
  if (accept.includes('br')) {
    encoding = 'br'; // 小さくなる方を優先する
  } else if (accept.includes('gzip')) {
    encoding = 'gzip';
  }
  console.log(`Accept-Encoding: ${accept || '（なし）'} → ${encoding}`);

  if (encoding === 'br') {
    res.setHeader('Content-Encoding', 'br');
    res.end(zlib.brotliCompressSync(big));
  } else if (encoding === 'gzip') {
    res.setHeader('Content-Encoding', 'gzip');
    res.end(zlib.gzipSync(big));
  } else {
    res.end(big);
  }
});

server.listen(8105, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8105/big で待ち受けています');
});
