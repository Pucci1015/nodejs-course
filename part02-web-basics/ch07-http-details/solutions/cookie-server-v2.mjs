// 練習問題3 の模範解答: 訪問回数に加えて、前回の訪問の日時を覚える。/reset で消す
// 使い方: node cookie-server-v2.mjs        curl -c c.txt -b c.txt http://127.0.0.1:8102/
import http from 'node:http';

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
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  if (req.url === '/reset') {
    // 同じ名前・同じ Path で Max-Age=0 を送ると、ブラウザは Cookie を消す
    res.setHeader('Set-Cookie', ['visits=; Max-Age=0; Path=/', 'last=; Max-Age=0; Path=/']);
    res.end('リセットしました\n');
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  const visits = Number(cookies.visits ?? 0) + 1;
  // 日時には空白や / が入るので、パーセントエンコードしてから Cookie に入れる
  const now = new Date().toLocaleString('ja-JP');

  // Set-Cookie を2つ送るときは、配列で渡す（ヘッダの行が2つになる）
  res.setHeader('Set-Cookie', [
    `visits=${visits}; Max-Age=600; Path=/; HttpOnly`,
    `last=${encodeURIComponent(now)}; Max-Age=600; Path=/; HttpOnly`,
  ]);

  let text = `${visits} 回目の訪問です。\n`;
  if (cookies.last !== undefined) {
    text += `前回の訪問: ${decodeURIComponent(cookies.last)}\n`;
  }
  res.end(text);
});

server.listen(8102, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8102/ で待ち受けています');
});
