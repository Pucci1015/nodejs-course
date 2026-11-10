// 練習問題8: お問い合わせフォームと、同じことをする JSON の API。バグがたくさんあります
// 確かめる: bash check-contact.sh
// 使い方: node buggy-contact.mjs   → ブラウザで http://127.0.0.1:9205/
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 9205);
const messages = [];
let nextId = 1;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function formPage(values = {}, errors = []) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>お問い合わせ</title></head><body>
<h1>お問い合わせ</h1>
${errors.length ? `<ul class="errors">${errors.map((e) => `<li>${e}</li>`).join('')}</ul>` : ''}
<form method="post" action="/contact">
  <p><label>名前 <input name="name" value="${values.name ?? ''}"></label></p>
  <p><label>メール <input name="email" value="${values.email ?? ''}"></label></p>
  <p><label>内容<br><textarea name="message">${values.message ?? ''}</textarea></label></p>
  <p>話題: <label><input type="checkbox" name="topics" value="node"> node</label>
           <label><input type="checkbox" name="topics" value="flask"> flask</label></p>
  <p><button>送る</button></p>
</form></body></html>`;
}

function validate(data) {
  const errors = [];
  if (data.name.trim() === '' || data.name.length > 50) errors.push('名前は 1〜50 文字で書いてください');
  if (!data.email.includes('@')) errors.push('メールの形が正しくありません');
  if (data.message.trim() === '' || data.message.length > 1000) errors.push('内容は 1〜1000 文字で書いてください');
  return errors;
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body));
  });
}

function parseForm(text) {
  const pairs = text.split('&').map((p) => p.split('=').map(decodeURIComponent));
  return Object.fromEntries(pairs);
}

function send(res, status, type, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body), ...headers });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(`http://localhost${req.url}`);

  if (req.method === 'GET' && pathname === '/') return send(res, 200, 'text/html; charset=utf-8', formPage());
  if (req.method === 'GET' && pathname === '/thanks') return send(res, 200, 'text/html; charset=utf-8', '<!doctype html><meta charset="utf-8"><p>ありがとうございました</p>');
  if (req.method === 'GET' && pathname === '/api/messages') return send(res, 200, 'application/json; charset=utf-8', JSON.stringify(messages));

  if (req.method === 'POST' && pathname === '/contact') {
    const data = parseForm(await readBody(req));
    const errors = validate(data);
    if (errors.length) return send(res, 200, 'text/html; charset=utf-8', formPage(data, errors));
    const topics = data.topics ? [data.topics] : [];
    messages.push({ id: nextId++, name: data.name, email: data.email, message: data.message, topics });
    return send(res, 200, 'text/html; charset=utf-8', '<!doctype html><meta charset="utf-8"><p>ありがとうございました</p>');
  }

  if (req.method === 'POST' && pathname === '/api/messages') {
    const data = JSON.parse(await readBody(req));
    const errors = validate(data);
    if (errors.length) return send(res, 422, 'application/json; charset=utf-8', JSON.stringify({ errors }));
    const msg = { id: nextId++, topics: [], ...data };
    messages.push(msg);
    return send(res, 201, 'application/json; charset=utf-8', JSON.stringify(msg), { Location: `/api/messages/${msg.id}` });
  }

  send(res, 404, 'text/plain; charset=utf-8', 'ありません\n');
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
