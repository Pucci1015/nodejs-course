// 練習問題5 用: アクセスログを付ける対象の「アプリ」（リクエストを処理する関数）
// このファイルは変更しない。自分で作る logged-server.mjs から import して使う。
//   import { handler } from './app-handler.mjs';
//   http.createServer((req, res) => { ... handler(req, res); ... })
//
// パス:
//   /            HTML を返す（Content-Length あり）
//   /hello-ja    日本語のテキスト（Content-Length あり）
//   /chunked     3回に分けて書く（chunked。全体の長さは事前に分からない）
//   /status/NNN  ステータスコード NNN を返す（204 と 304 はボディなし）
//   /slow        2秒待ってから返す（待っている間に curl を Ctrl + C で止めてみる）
import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';

export async function handler(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname === '/') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><title>ログの練習</title><h1>ようこそ</h1>\n');
  } else if (pathname === '/hello-ja') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('こんにちは\n');
  } else if (pathname === '/chunked') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    for (const part of ['いち\n', 'に\n', 'さん\n']) {
      res.write(part);
      await sleep(100);
    }
    res.end();
  } else if (/^\/status\/[2-5]\d\d$/.test(pathname)) {
    res.statusCode = Number(pathname.slice(-3));
    if (res.statusCode === 204 || res.statusCode === 304) {
      res.end();
    } else {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(`${res.statusCode} ${http.STATUS_CODES[res.statusCode] ?? ''}\n`);
    }
  } else if (pathname === '/slow') {
    await sleep(2000);
    if (res.destroyed) return; // 待っている間にクライアントが切断した
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('お待たせしました\n');
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('見つかりません\n');
  }
}
