// 別のオリジンの API を fetch する画面を配信するサーバ（第9章 5.1節・5.2節で書くものの完成形）
// 使い方: node my-front.mjs        ブラウザで http://localhost:8310/ を開く（API は my-api.mjs）
import http from 'node:http';

// ブラウザで動く HTML と JavaScript。ボタンを押すと、8311番の API を fetch する
const page = `<!doctype html>
<meta charset="utf-8">
<title>CORS の実験</title>
<h1>CORS の実験（画面は 8310番、API は 8311番）</h1>
<button id="get">GET で呼ぶ</button>
<button id="put">PUT と JSON で呼ぶ</button>
<pre id="out"></pre>
<script type="module">
  const out = document.querySelector('#out');

  async function call(options) {
    try {
      const res = await fetch('http://localhost:8311/api/hello', options);
      out.textContent = await res.text();
    } catch (err) {
      out.textContent = 'エラー: ' + err.message + '（Console を見る）';
    }
  }

  document.querySelector('#get').addEventListener('click', () => call({}));
  document.querySelector('#put').addEventListener('click', () =>
    call({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"name":"alice"}' }),
  );
</script>
`;

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(page);
});

server.listen(8310, '127.0.0.1', () => {
  console.log('画面: http://localhost:8310/');
});
