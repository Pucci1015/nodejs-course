// レスポンスの返し方いろいろ（第17章 4節）
// 使い方: node response-demo.mjs   → curl -i http://127.0.0.1:9172/<パス>
//   /auto        setHeader + end(本文): Content-Length が自動で付く
//   /chunked     write を2回: Transfer-Encoding: chunked になる
//   /writehead   writeHead でステータスとヘッダをまとめて送る
//   /bytes       日本語の本文。Content-Length はバイト数
//   /late        write の後に setHeader → ERR_HTTP_HEADERS_SENT（サーバは落ちないように捕まえている）
//   /twice       end の後に write → ERR_STREAM_WRITE_AFTER_END（'error' イベントで届く）
//   /no-end      end を呼ばない → 客は待ち続ける（curl --max-time 2 で試す）
//   curl -I ...  HEAD: ヘッダだけ返る（本文は Node.js が捨てる）
import http from 'node:http';

const PORT = 9172;
const text = 'text/plain; charset=utf-8';

const routes = {
  '/auto'(req, res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', text);
    res.end('全部まとめて渡したので、長さが分かる\n');
  },
  '/chunked'(req, res) {
    res.setHeader('Content-Type', text);
    res.write('1つ目のかたまり\n'); // この時点でヘッダが送られる。長さはまだ分からない
    setTimeout(() => res.end('2つ目のかたまり\n'), 500);
  },
  '/writehead'(req, res) {
    res.writeHead(201, { 'Content-Type': text, 'X-Demo': 'writeHead' });
    res.end('作りました\n');
  },
  '/bytes'(req, res) {
    const body = 'あいう\n';
    res.setHeader('Content-Type', text);
    res.setHeader('X-String-Length', String(body.length)); // 4（文字の数）
    res.end(body); // Content-Length は 10（バイトの数）
  },
  '/late'(req, res) {
    res.setHeader('Content-Type', text);
    res.write('先に本文を書いた\n');
    try {
      res.setHeader('X-Too-Late', '1');
    } catch (err) {
      console.error(`/late: ${err.code}: ${err.message}`);
      res.write(`ヘッダを足せなかった: ${err.code}\n`);
    }
    res.end();
  },
  '/twice'(req, res) {
    res.on('error', (err) => console.error(`/twice: ${err.code}: ${err.message}`));
    res.setHeader('Content-Type', text);
    res.end('1回目\n');
    res.write('2回目\n'); // 'error' イベントになる。リスナーが無いとプロセスが落ちる
  },
  '/no-end'(req, res) {
    res.setHeader('Content-Type', text);
    res.write('書き始めたが、終わらない…\n');
  },
};

const server = http.createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  console.log(`${req.method} ${req.url}`);
  const route = Object.hasOwn(routes, path) ? routes[path] : null;
  if (!route) {
    res.writeHead(404, { 'Content-Type': text });
    res.end(`ありません。${Object.keys(routes).join(' ')} のどれかを開いてください\n`);
    return;
  }
  route(req, res);
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
