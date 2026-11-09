// ハンドラの中の例外で、サーバごと止まる（第17章 5節）
// 使い方:
//   node crash-demo.mjs          → curl http://127.0.0.1:9173/throw などを開くと、プロセスが落ちる
//   node crash-demo.mjs safe     → 例外を捕まえて 500 を返す。サーバは動き続ける
//   パス: /ok  /throw（同期の例外）  /reject（await の先の失敗）  /callback（コールバックの中の例外）
import fs from 'node:fs';
import http from 'node:http';

const PORT = 9173;
const safe = process.argv[2] === 'safe';

async function handler(req, res) {
  switch (req.url) {
    case '/ok':
      res.end('ok\n');
      return;
    case '/throw':
      JSON.parse('{ 壊れた JSON'); // SyntaxError が投げられる
      return;
    case '/reject':
      await fs.promises.readFile('/no/such/file'); // ENOENT で rejected
      return;
    case '/callback':
      // コールバックの中の例外は、下の try/catch では捕まえられない（別の時に呼ばれるため）
      setTimeout(() => {
        throw new Error('タイマーの中の例外');
      }, 10);
      res.end('すぐに返したが、10ms 後に…\n');
      return;
    default:
      res.statusCode = 404;
      res.end('not found\n');
  }
}

const server = http.createServer(
  safe
    ? async (req, res) => {
        try {
          await handler(req, res); // 同期の例外も、await の先の失敗も、ここで捕まる
        } catch (err) {
          console.error(`${req.method} ${req.url} でエラー:`, err.message);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('サーバの中でエラーが起きました\n'); // 詳しい中身（スタックなど）は客に見せない
          } else {
            res.destroy(); // もう途中まで返してしまった。接続を切って「失敗した」ことを伝える
          }
        }
      }
    : handler,
);

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（${safe ? 'safe' : '何もしない'}）`));
