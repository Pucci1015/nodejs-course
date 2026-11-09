// node:http で作る「届いたリクエストを JSON で返す」サーバ（第6章 10節）
// raw-http-server.mjs で手作業していた解析を、node:http がどこまでやってくれるかを確かめる。
// 練習問題でも、リクエストを送る相手として使う。
// 使い方: node http-echo-server.mjs [ポート]   既定: 8081
//
// パス:
//   /（ほか下に無いもの） リクエストの内容を JSON で返す
//   /hello-ja             日本語のテキストを返す（Content-Length は バイト数）
//   /chunked              Content-Length を付けず、3回に分けて送る（chunked になる）
//   /status/NNN           ステータスコード NNN を返す（例: /status/404）
//   /slow                 3秒待ってから返す
import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';

const port = Number(process.argv[2] ?? 8081);

const server = http.createServer(async (req, res) => {
  // ボディは自動では読まれない。ストリームとして届くので、全部集める（第3部・第4部で詳しく）
  const chunks = [];
  try {
    for await (const chunk of req) chunks.push(chunk);
  } catch (err) {
    // ボディを読み終える前に接続が切れると、ここでエラー（aborted）になる。
    // 捕まえないと async 関数の Promise が拒否され、サーバ全体が止まってしまう
    console.log(`${req.method} ${req.url} ボディの途中で接続が切れました（${err.code ?? err.message}）`);
    return;
  }
  const body = Buffer.concat(chunks);
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  console.log(`${req.method} ${req.url} HTTP/${req.httpVersion} （ボディ ${body.length} バイト）`);

  if (url.pathname === '/hello-ja') {
    const text = 'こんにちは、HTTP！\n';
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Length': Buffer.byteLength(text), // text.length（文字数）ではない
    });
    res.end(text);
    return;
  }

  if (url.pathname === '/chunked') {
    // Content-Length を指定せずに write すると、node:http は Transfer-Encoding: chunked で送る
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    for (const part of ['1つ目\n', '2つ目\n', '3つ目\n']) {
      res.write(part);
      await sleep(500);
    }
    res.end();
    return;
  }

  const statusMatch = url.pathname.match(/^\/status\/(\d{3})$/);
  if (statusMatch) {
    const status = Number(statusMatch[1]);
    if (status < 200 || status > 599) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('200〜599 を指定してください\n');
      return;
    }
    // 204 と 304 はボディを持てない
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(status === 204 || status === 304 ? undefined : `${status} ${http.STATUS_CODES[status] ?? ''}\n`);
    return;
  }

  if (url.pathname === '/slow') await sleep(3000);

  const result = {
    method: req.method,
    url: req.url,
    pathname: url.pathname,
    query: Object.fromEntries(url.searchParams),
    httpVersion: req.httpVersion,
    headers: req.headers, // 名前は小文字にそろえられている
    rawHeaders: req.rawHeaders, // 送られてきたときの大文字・小文字のまま
    bodyBytes: body.length,
    body: body.toString('utf8'),
    remote: `${req.socket.remoteAddress}:${req.socket.remotePort}`,
  };
  const json = `${JSON.stringify(result, null, 2)}\n`;
  // writeHead を使わず、setHeader でヘッダを用意してから end に全部渡すと、
  // node:http が Content-Length を計算して付けてくれる。
  // （writeHead でヘッダを先に確定させると、長さが分からないので chunked になる）
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(json);
});

server.listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/ で待ち受けています（Ctrl + C で終了）`));
