// 第20章 5節で書く、HTML のフォームを受け取るサーバの完成形
// 使い方（~/dev/part04/ch20-request-body で）: node samples/form-server.mjs → ブラウザで http://127.0.0.1:9206/
//   curl で: curl -i -d 'name=ねこ&tags=js&tags=node' http://127.0.0.1:9206/submit
import http from 'node:http';

const PORT = 9206;

const FORM = `<!doctype html>
<meta charset="utf-8">
<title>フォームの練習</title>
<form method="post" action="/submit">
  <p>名前 <input name="name"></p>
  <p><label><input type="checkbox" name="tags" value="js"> js</label>
     <label><input type="checkbox" name="tags" value="node"> node</label></p>
  <p><button>送る</button></p>
</form>
`;

function send(res, status, type, text) {
  res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Content-Length': Buffer.byteLength(text) });
  res.end(text);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    return send(res, 200, 'text/html', FORM);
  }
  if (req.method === 'POST' && req.url === '/submit') {
    const type = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
    if (type !== 'application/x-www-form-urlencoded') {
      return send(res, 415, 'text/plain', 'フォームの形で送ってください\n');
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString('utf8');
    console.log('届いたボディ:', text);

    const form = new URLSearchParams(text); // + を空白に、%xx を文字に戻してくれる
    const name = form.get('name') ?? '';
    const tags = form.getAll('tags');
    return send(res, 200, 'text/plain', `名前: ${name}\nタグ: ${tags.join(', ') || '（なし）'}\n`);
  }
  send(res, 404, 'text/plain', '見つかりません\n');
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
