// 第22章 4節で書く、Cookie には ID だけを入れ、中身をサーバに置くサーバの完成形
// 使い方（~/dev/part04/ch22-cookie-session で）: node samples/my-session.mjs
//   curl で: curl -c cookies.txt -b cookies.txt http://127.0.0.1:9226/   （何度か打つ）
// 本文で自分が書くファイル（my-session.mjs）は ./samples/cookie-basic.mjs を、このファイルは同じフォルダの ./cookie-basic.mjs を読み込む
import http from 'node:http';
import crypto from 'node:crypto';
import { parseCookies, serializeCookie } from './cookie-basic.mjs';

const PORT = 9226;
const sessions = new Map(); // ID → セッションの中身

const server = http.createServer((req, res) => {
  const sid = parseCookies(req.headers.cookie).sid;
  let session = sessions.get(sid);

  if (!session) {
    // ID が無い、またはサーバの知らない ID なら、新しく作る
    const newSid = crypto.randomBytes(32).toString('base64url');
    session = { count: 0 };
    sessions.set(newSid, session);
    res.setHeader('Set-Cookie', serializeCookie('sid', newSid));
    console.log('新しいセッション:', newSid);
  }

  session.count += 1;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(`このセッションで ${session.count} 回目です（サーバにあるセッション: ${sessions.size} 個）\n`);
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
