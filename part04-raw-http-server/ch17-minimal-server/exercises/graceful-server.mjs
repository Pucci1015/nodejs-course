// 練習問題8: SIGTERM / SIGINT で安全に止まるサーバ
// 仕様は README の練習問題8を見てください。
// 確かめる: bash check-shutdown.sh
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 9178);
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 3000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let served = 0;

const server = http.createServer(async (req, res) => {
  if (req.url === '/slow') await sleep(1000);
  if (req.url === '/hang') return; // わざと返さない（終わらない処理のつもり）
  served++;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(`${req.url} done\n`);
});

// 10 秒ごとに、何件返したかをログに書く
const statsTimer = setInterval(() => console.log(`これまでに ${served} 件返しました`), 10_000);

// ここを書く（SIGTERM と SIGINT を受け取ったときの処理）

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（PID ${process.pid}）`));
