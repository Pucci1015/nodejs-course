// 第10章 2節・7節で書く、いちばん小さな MPA（メモ帳）の完成形
// 使い方: node samples/mini-mpa.mjs   → http://localhost:8505/
//   サーバが HTML を丸ごと作って返す。フォームの送信は PRG（POST → 303 → GET）。
//   メモはメモリの中にだけあるので、サーバを止めると元に戻る。
import http from 'node:http';

const memos = ['牛乳を買う'];

// HTML の中で特別な意味を持つ文字を、文字として表示される形に置き換える
function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// 一覧のページの HTML を作る
function page() {
  let items = '';
  for (const memo of memos) {
    items += `<li>${escapeHtml(memo)}</li>\n`;
  }
  return `<!doctype html>
<html lang="ja">
<head><meta charset="utf-8"><title>メモ（MPA）</title></head>
<body>
<h1>メモ（MPA）</h1>
<form method="post" action="/memos">
  <input name="text">
  <button>追加</button>
</form>
<ul>
${items}</ul>
</body>
</html>
`;
}

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page());
    return;
  }

  if (req.method === 'POST' && req.url === '/memos') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      const text = new URLSearchParams(body).get('text');
      memos.push(text);
      // PRG: 結果の HTML を直接返さず、一覧へ 303 でリダイレクトする
      res.writeHead(303, { Location: '/' });
      res.end();
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('見つかりません\n');
});

server.listen(8505, () => console.log('MPA のメモ: http://localhost:8505/'));
