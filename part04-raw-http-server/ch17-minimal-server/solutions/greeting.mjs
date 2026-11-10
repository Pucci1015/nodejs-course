// 練習問題1 の模範解答
import http from 'node:http';

function sendText(res, status, text) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(text));
  res.end(text);
}

export function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') {
    sendText(res, 200, 'トップページです\n');
  } else if (url.pathname === '/hello') {
    const name = url.searchParams.get('name') || 'ゲスト';
    sendText(res, 200, `こんにちは、${name}さん\n`);
  } else {
    sendText(res, 404, '見つかりません\n');
  }
}

if (import.meta.main) {
  http.createServer(handler).listen(9179, '127.0.0.1', () => console.log('http://127.0.0.1:9179/ で待っています（Ctrl+C で止める）'));
}
