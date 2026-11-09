// 圧縮して返す（第19章 8節）
// 使い方: node gzip-demo.mjs
//   curl -s -o /dev/null -w '%{size_download} バイト\n' http://127.0.0.1:9194/big.txt
//   curl -s -o /dev/null -w '%{size_download} バイト\n' -H 'Accept-Encoding: gzip' http://127.0.0.1:9194/big.txt
//   curl -s --compressed http://127.0.0.1:9194/big.txt | head -3   （curl に、戻して表示させる）
import http from 'node:http';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import zlib from 'node:zlib';

const PORT = 9194;
// 同じような行が並ぶ、よく縮む文字のデータ（約 100KB）
const big = Array.from({ length: 2000 }, (_, i) => `${String(i).padStart(4, '0')}: 静的ファイルの練習。同じような行が続きます。\n`).join('');

const server = http.createServer(async (req, res) => {
  if (new URL(`http://localhost${req.url}`).pathname !== '/big.txt') {
    res.writeHead(404).end();
    return;
  }
  const accept = req.headers['accept-encoding'] ?? '';
  // 簡単な確かめ方。q=0（いらない）などは見ていない。きちんとした読み方は練習問題6
  const encoding = /\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : null;
  const headers = {
    'Content-Type': 'text/plain; charset=utf-8',
    Vary: 'Accept-Encoding', // 「Accept-Encoding によって中身が変わる」と、途中のキャッシュに知らせる
  };
  console.log(`${req.method} ${req.url} Accept-Encoding=${accept || '-'} → ${encoding ?? '圧縮しない'}`);
  if (!encoding) {
    res.writeHead(200, { ...headers, 'Content-Length': Buffer.byteLength(big) });
    res.end(big);
    return;
  }
  // 圧縮した後の長さは、圧縮し終わるまで分からない。Content-Length を付けずに流す（chunked になる）
  res.writeHead(200, { ...headers, 'Content-Encoding': encoding });
  const compressor = encoding === 'br' ? zlib.createBrotliCompress() : zlib.createGzip();
  await pipeline(Readable.from([big]), compressor, res).catch(() => res.destroy());
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/big.txt で待っています`));
