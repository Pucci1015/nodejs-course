// 第22章 3節で書く、訪問回数を Cookie に入れるサーバの完成形
// 使い方（~/dev/part04/ch22-cookie-session で）: node samples/visits.mjs → curl -i http://127.0.0.1:9226/
// 本文で自分が書くファイル（visits.mjs）は ./samples/cookie-basic.mjs を、このファイルは同じフォルダの ./cookie-basic.mjs を読み込む
import http from 'node:http';
import { parseCookies, serializeCookie } from './cookie-basic.mjs';

const PORT = 9226;

const server = http.createServer((req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  console.log('届いた Cookie:', cookies);

  const visits = (Number(cookies.visits) || 0) + 1;
  res.setHeader('Set-Cookie', serializeCookie('visits', String(visits), { maxAge: 60 * 60 * 24 * 30 }));
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(`${visits} 回目の訪問です\n`);
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
