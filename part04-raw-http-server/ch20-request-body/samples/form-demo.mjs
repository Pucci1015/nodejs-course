// HTML のフォームを受け取る（第20章 5節）
// 使い方: node form-demo.mjs   → ブラウザで http://127.0.0.1:9201/
//   curl -i -d 'name=ねこ&message=a+b%2Bc&tags=js&tags=node' http://127.0.0.1:9201/submit
import http from 'node:http';
import { createApp, HttpError } from '../../ch17-minimal-server/solutions/app.mjs';
import { redirect, sendHtml } from '../../ch17-minimal-server/solutions/send.mjs';
import { readBodySimple } from './simple-body.mjs';

const PORT = 9201;
const received = []; // 受け取ったもの（メモリに置くだけ）

// HTML に入れる文字は必ずエスケープする（第2部 第10章。詳しくは第21章）
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const page = (body) => `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>フォームの練習</title></head>
<body>${body}</body></html>`;

const form = `
<h1>フォームの練習</h1>
<form method="post" action="/submit">
  <p><label>名前 <input name="name" required></label></p>
  <p><label>メッセージ<br><textarea name="message" rows="3" cols="40">1行目
2行目 a+b&amp;c=d</textarea></label></p>
  <p>タグ:
    <label><input type="checkbox" name="tags" value="js" checked> js</label>
    <label><input type="checkbox" name="tags" value="node" checked> node</label>
    <label><input type="checkbox" name="tags" value="flask"> flask</label></p>
  <p><label><input type="checkbox" name="agree"> 同意する</label></p>
  <p><button>送る</button></p>
</form>`;

async function handler(req, res) {
  const { pathname, searchParams } = new URL(`http://localhost${req.url}`);
  if (req.method === 'GET' && pathname === '/') return sendHtml(res, 200, page(form));

  if (req.method === 'POST' && pathname === '/submit') {
    const raw = await readBodySimple(req);
    const params = new URLSearchParams(raw); // + を空白に、%xx を文字に戻してくれる
    const item = {
      raw,
      name: params.get('name'),
      message: params.get('message'),
      tags: params.getAll('tags'), // 同じ名前が何回も来る
      agree: params.has('agree'), // チェックしないと、名前ごと送られない
    };
    received.push(item);
    console.log(item);
    // 受け取った後は、303 で別のページへ（PRG。第2部 第10章）。再読み込みで2回送られない
    return redirect(res, `/result?id=${received.length - 1}`, 303);
  }

  if (req.method === 'GET' && pathname === '/result') {
    const item = received[Number(searchParams.get('id'))];
    if (!item) throw new HttpError(404, 'ありません');
    return sendHtml(res, 200, page(`
<h1>受け取りました</h1>
<p>届いたボディ（そのまま）:</p><pre>${esc(item.raw)}</pre>
<table border="1">
  <tr><th>name</th><td>${esc(item.name)}</td></tr>
  <tr><th>message</th><td><pre>${esc(item.message)}</pre></td></tr>
  <tr><th>tags</th><td>${esc(JSON.stringify(item.tags))}</td></tr>
  <tr><th>agree</th><td>${item.agree}</td></tr>
</table>
<p><a href="/">もう一度</a></p>`));
  }
  throw new HttpError(404, 'ありません');
}

http.createServer(createApp(handler)).listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
