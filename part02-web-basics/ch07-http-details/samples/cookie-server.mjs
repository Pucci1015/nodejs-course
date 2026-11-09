// 訪問回数を Cookie で数えるサーバ（第7章 3節で書くものの完成形）
// 使い方: node cookie-server.mjs        curl -c c.txt -b c.txt http://127.0.0.1:8102/
import http from 'node:http';

// 'a=1; b=2' → { a: '1', b: '2' }
function parseCookies(header) {
  const cookies = {};
  if (header === undefined) return cookies;
  for (const part of header.split('; ')) {
    const [name, value] = part.split('=');
    cookies[name] = value;
  }
  return cookies;
}

const server = http.createServer((req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const visits = Number(cookies.visits ?? 0) + 1;

  res.setHeader('Set-Cookie', `visits=${visits}; Max-Age=600; Path=/; HttpOnly`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(`${visits} 回目の訪問です。届いた Cookie: ${req.headers.cookie ?? '（なし）'}\n`);
});

server.listen(8102, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8102/ で待ち受けています');
});
