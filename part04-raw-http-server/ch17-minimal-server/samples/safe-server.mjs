// 第17章 5節で書く、ハンドラの例外を捕まえて 500 を返すサーバの完成形
// 使い方（~/dev/part04/ch17-minimal-server で）: node samples/safe-server.mjs
//   別のターミナルで: curl -i http://127.0.0.1:9179/boom   → 500。サーバは止まらない
//                     curl -i http://127.0.0.1:9179/       → 200
import http from 'node:http';

const PORT = 9179;

async function handler(req, res) {
  if (req.url === '/boom') {
    throw new Error('わざと起こしたエラー');
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('ok\n');
}

const server = http.createServer(async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    console.error('エラー:', err.message); // 中身はサーバのログにだけ書く
    if (res.headersSent) {
      res.destroy(); // もう途中まで返してしまった。接続を切る
      return;
    }
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('サーバの中でエラーが起きました\n'); // 客には中身を見せない
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
