// 第10章 3節で書く、いちばん小さな SPA（メモ帳）の完成形
// 使い方: node samples/mini-spa.mjs   → http://localhost:8506/
//   サーバは「空の一覧の HTML」と「JSON の API」だけを返す。画面はブラウザの JavaScript が作る。
//   メモはメモリの中にだけあるので、サーバを止めると元に戻る。
import http from 'node:http';

const memos = ['牛乳を買う'];

// ブラウザに渡す HTML。<script type="module"> の中は、ブラウザで動く JavaScript
const html = `<!doctype html>
<html lang="ja">
<head><meta charset="utf-8"><title>メモ（SPA）</title></head>
<body>
<h1>メモ（SPA）</h1>
<form id="form">
  <input id="text">
  <button>追加</button>
</form>
<ul id="list"><li>読み込み中…</li></ul>
<script type="module">
  const list = document.querySelector('#list');
  const input = document.querySelector('#text');

  // API から一覧を取ってきて、<ul> の中を作り直す
  async function render() {
    const res = await fetch('/api/memos');
    const memos = await res.json();
    list.textContent = '';
    for (const memo of memos) {
      const li = document.createElement('li');
      li.textContent = memo;
      list.append(li);
    }
  }

  document.querySelector('#form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await fetch('/api/memos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input.value }),
    });
    input.value = '';
    await render();
  });

  render();
</script>
</body>
</html>
`;

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (req.method === 'GET' && req.url === '/api/memos') {
    sendJson(res, 200, memos);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/memos') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      const data = JSON.parse(body);
      memos.push(data.text);
      sendJson(res, 201, { text: data.text });
    });
    return;
  }

  sendJson(res, 404, { error: '見つかりません' });
});

server.listen(8506, () => console.log('SPA のメモ: http://localhost:8506/'));
