// 練習問題7: 伝言板の小さなサーバ。ブラウザで / を開くと動いているように見えますが、バグがたくさんあります
// 確かめる: bash check-server.sh
// 使い方: node buggy-server.mjs   → http://127.0.0.1:9177/
import fs from 'node:fs/promises';
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 9177);
const messages = [
  { id: 1, name: 'alice', text: 'はじめまして' },
  { id: 2, name: 'Node', text: 'こんにちは、世界' },
];
let nextId = 3;

function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': body.length,
    ...headers,
  });
  res.end(body);
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && pathname === '/') {
    const items = messages.map((m) => `<li>${escapeHtml(m.name)}: ${escapeHtml(m.text)}</li>`).join('\n');
    res.setHeader('Content-Type', 'text/html');
    res.write('<!doctype html>\n<title>伝言板</title>\n');
    res.setHeader('Cache-Control', 'no-store');
    res.end(`<ul>\n${items}\n</ul>\n`);
    return;
  }

  if (req.method === 'GET' && pathname === '/api/messages') {
    sendJson(res, 200, messages);
    return;
  }

  const m = /^\/api\/messages\/(\d+)$/.exec(pathname);
  if (req.method === 'GET' && m) {
    const found = messages.find((x) => x.id === Number(m[1]));
    if (found) sendJson(res, 200, found);
    return;
  }

  if (req.method === 'POST' && pathname === '/api/messages') {
    let text = '';
    req.on('data', (chunk) => (text += chunk));
    req.on('end', () => {
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        sendJson(res, 400, { error: 'JSON ではありません' });
      }
      const msg = { id: nextId++, name: data.name, text: data.text };
      messages.push(msg);
      sendJson(res, 201, msg, { Location: `/api/messages/${msg.id}` });
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/stats') {
    const stats = JSON.parse(await fs.readFile(new URL('./stats.json', import.meta.url), 'utf8'));
    sendJson(res, 200, stats);
    return;
  }

  sendJson(res, 404, { error: 'ありません' });
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
