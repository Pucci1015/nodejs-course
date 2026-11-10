// ファイルのアップロード（multipart/form-data）を受け取る（第20章 8節）
// 使い方: node multipart-demo.mjs   → ブラウザで http://127.0.0.1:9204/ を開き、小さな画像を選んで送る
//   curl -i -F 'title=テスト' -F 'file=@../../ch19-static-files/samples/public/img/logo.svg' http://127.0.0.1:9204/upload
// 受け取ったファイルは保存せず、名前・大きさ・最初のバイトを表示するだけ
import http from 'node:http';
import { createApp, HttpError } from '../../ch17-minimal-server/solutions/app.mjs';
import { sendHtml } from '../../ch17-minimal-server/solutions/send.mjs';
import { readFormData } from './form-data.mjs';

const PORT = 9204;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const form = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>アップロード</title></head><body>
<h1>アップロードの練習</h1>
<!-- ファイルを送るには、method="post" と enctype="multipart/form-data" の両方が要る -->
<form method="post" action="/upload" enctype="multipart/form-data">
  <p><label>題名 <input name="title" value="テスト"></label></p>
  <p><input type="file" name="file"></p>
  <p><button>送る</button></p>
</form></body></html>`;

async function handler(req, res) {
  const { pathname } = new URL(`http://localhost${req.url}`);
  if (req.method === 'GET' && pathname === '/') return sendHtml(res, 200, form);
  if (req.method === 'POST' && pathname === '/upload') {
    console.log(`Content-Type: ${req.headers['content-type']}`);
    const fd = await readFormData(req, { limit: 2 * 1024 * 1024 });
    const rows = [];
    for (const [name, value] of fd) {
      if (typeof value === 'string') {
        rows.push(`<tr><th>${esc(name)}</th><td>文字: ${esc(value)}</td></tr>`);
      } else {
        // value は File。name と type は「客が言っていること」で、本当かどうかは分からない
        const head = Buffer.from(await value.slice(0, 8).arrayBuffer()).toString('hex').replace(/(..)/g, '$1 ');
        rows.push(`<tr><th>${esc(name)}</th><td>ファイル: name=${esc(value.name)} type=${esc(value.type)} size=${value.size}<br>最初の 8 バイト: <code>${head}</code></td></tr>`);
      }
    }
    return sendHtml(res, 200, `<!doctype html><meta charset="utf-8"><title>受け取りました</title>
<h1>受け取りました</h1><table border="1">${rows.join('')}</table><p><a href="/">戻る</a></p>`);
  }
  throw new HttpError(404, 'ありません');
}

http.createServer(createApp(handler)).listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
