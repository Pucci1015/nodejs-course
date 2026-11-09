// 練習問題1・2 の解答: mini-mpa.mjs に「削除」と「空の入力のエラー」を足したもの（足した所に「追加」と書いた）
// 使い方: node solutions/mini-mpa-v2.mjs   → http://localhost:8505/
import http from 'node:http';

const memos = ['牛乳を買う'];

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// 追加（問題2）: error はエラーの文、value は入力欄に戻す値。どちらも無いときは '' を渡す
function page(error, value) {
  let items = '';
  // 追加（問題1）: 番号（1から数える）が要るので、for...of ではなく、i を数える for で回す
  for (let i = 0; i < memos.length; i++) {
    const number = i + 1;
    items += `<li>${escapeHtml(memos[i])}
  <form method="post" action="/memos/${number}/delete" style="display: inline"><button>削除</button></form>
</li>
`;
  }

  let errorHtml = '';
  if (error !== '') {
    errorHtml = `<p style="color: red">${escapeHtml(error)}</p>\n`;
  }

  return `<!doctype html>
<html lang="ja">
<head><meta charset="utf-8"><title>メモ（MPA）</title></head>
<body>
<h1>メモ（MPA）</h1>
<form method="post" action="/memos">
  <input name="text" value="${escapeHtml(value)}">
  <button>追加</button>
</form>
${errorHtml}<ul>
${items}</ul>
</body>
</html>
`;
}

function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);

  if (req.method === 'GET' && req.url === '/') {
    sendHtml(res, 200, page('', ''));
    return;
  }

  if (req.method === 'POST' && req.url === '/memos') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      const text = new URLSearchParams(body).get('text');
      // 追加（問題2）: text が無い（null）か、空白だけなら 422。入力した値をフォームに戻す
      if (text === null || text.trim() === '') {
        sendHtml(res, 422, page('メモを入力してください', text || ''));
        return;
      }
      memos.push(text);
      res.writeHead(303, { Location: '/' });
      res.end();
    });
    return;
  }

  // 追加（問題1）: POST /memos/番号/delete
  // '/memos/2/delete' を '/' で区切ると ['', 'memos', '2', 'delete']
  const parts = req.url.split('/');
  if (req.method === 'POST' && parts.length === 4 && parts[1] === 'memos' && parts[3] === 'delete') {
    const number = Number(parts[2]);
    if (Number.isInteger(number) && number >= 1 && number <= memos.length) {
      memos.splice(number - 1, 1); // 番号は1から、配列の位置は0から数えるので、1を引く
      res.writeHead(303, { Location: '/' });
      res.end();
      return;
    }
    sendHtml(res, 404, '<!doctype html><meta charset="utf-8"><p>そのメモはありません</p>\n');
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('見つかりません\n');
});

server.listen(8505, () => console.log('MPA のメモ: http://localhost:8505/'));
