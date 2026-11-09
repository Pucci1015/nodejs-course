// 練習問題3 の解答: mini-spa.mjs に「削除」を足したもの（足した所に「追加」と書いた）
// 使い方: node solutions/mini-spa-v2.mjs   → http://localhost:8506/
import http from 'node:http';

const memos = ['牛乳を買う'];

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

  async function render() {
    const res = await fetch('/api/memos');
    const memos = await res.json();
    list.textContent = '';
    // 追加: 番号が要るので、i を数える for で回す。
    //   let で作った i は、回るたびに別の変数になるので、クリックされたときにも、その行の i が使われる
    for (let i = 0; i < memos.length; i++) {
      const li = document.createElement('li');
      li.textContent = memos[i] + ' ';
      const button = document.createElement('button');
      button.textContent = '削除';
      button.addEventListener('click', async () => {
        await fetch('/api/memos/' + (i + 1), { method: 'DELETE' });
        await render();
      });
      li.append(button);
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

  // 追加: DELETE /api/memos/番号
  // '/api/memos/2' を '/' で区切ると ['', 'api', 'memos', '2']
  const parts = req.url.split('/');
  if (req.method === 'DELETE' && parts.length === 4 && parts[1] === 'api' && parts[2] === 'memos') {
    const number = Number(parts[3]);
    if (Number.isInteger(number) && number >= 1 && number <= memos.length) {
      memos.splice(number - 1, 1);
      res.writeHead(204); // 204 No Content: 成功。返すボディは無い
      res.end();
      return;
    }
    sendJson(res, 404, { error: 'そのメモはありません' });
    return;
  }

  sendJson(res, 404, { error: '見つかりません' });
});

server.listen(8506, () => console.log('SPA のメモ: http://localhost:8506/'));
