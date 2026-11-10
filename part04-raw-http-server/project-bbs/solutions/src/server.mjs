#!/usr/bin/env node
// 掲示板を起動する
// 使い方: node src/server.mjs   → ブラウザで http://127.0.0.1:9230/
// 環境変数: PORT（既定 9230）、DATA_DIR（既定 ./data）、SESSION_TTL_MS（既定 30 分）
import http from 'node:http';
import path from 'node:path';
import { Store } from './store.mjs';
import { SessionStore } from './lib/session.mjs';
import { createBbsApp } from './app.mjs';

const PORT = Number(process.env.PORT ?? 9230);
const DATA_DIR = path.resolve(process.env.DATA_DIR ?? 'data');
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS ?? 30 * 60 * 1000);
const SHUTDOWN_TIMEOUT_MS = 5000;

const store = await Store.open(DATA_DIR);
const sessions = new SessionStore({ ttlMs: SESSION_TTL_MS });
const pruner = setInterval(() => sessions.prune(), 60_000);

const server = http.createServer(createBbsApp({ store, sessions, publicDir: path.join(import.meta.dirname, '..', 'public') }));
server.headersTimeout = 10_000;
server.requestTimeout = 30_000;

server.listen(PORT, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${PORT}/ で待っています（データ: ${path.join(DATA_DIR, 'bbs.json')}）`);
});

// 止めるときは、受け付け中のリクエストを終えてから（第17章 7節）
let stopping = false;
function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`${signal} を受け取りました。止めます`);
  clearInterval(pruner);
  server.close(() => process.exit(0));
  server.closeIdleConnections();
  setTimeout(() => {
    console.error('時間内に終わらなかった接続を切ります');
    server.closeAllConnections();
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
