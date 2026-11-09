// 練習問題2 解答例: 伝言板の小さなサーバ（直したもの）
// 使い方: node server.mjs   → http://127.0.0.1:9177/
import fs from 'node:fs/promises';
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 9177);
const messages = [
  { id: 1, name: 'りょうた', text: 'はじめまして' },
  { id: 2, name: 'Node', text: 'こんにちは、世界' },
];
let nextId = 3;

function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    // 修正: 文字の数（body.length）ではなく、バイトの数
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function handle(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && pathname === '/') {
    const items = messages.map((m) => `<li>${escapeHtml(m.name)}: ${escapeHtml(m.text)}</li>`).join('\n');
    // 修正: ヘッダは本文を書く前に全部決める。charset も付ける
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(`<!doctype html>\n<meta charset="utf-8">\n<title>伝言板</title>\n<ul>\n${items}\n</ul>\n`);
    return;
  }

  if (req.method === 'GET' && pathname === '/api/messages') {
    sendJson(res, 200, messages);
    return;
  }

  const m = /^\/api\/messages\/(\d+)$/.exec(pathname);
  if (req.method === 'GET' && m) {
    const found = messages.find((x) => x.id === Number(m[1]));
    if (!found) {
      sendJson(res, 404, { error: 'ありません' }); // 修正: 見つからないときも、必ず返す
      return;
    }
    sendJson(res, 200, found);
    return;
  }

  if (req.method === 'POST' && pathname === '/api/messages') {
    // 修正: ボディを最後まで読んでから使う
    const text = await readBody(req);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      sendJson(res, 400, { error: 'JSON ではありません' });
      return; // 修正: 返した後は、先に進まない
    }
    if (typeof data?.name !== 'string' || typeof data?.text !== 'string') {
      sendJson(res, 400, { error: 'name と text を文字列で送ってください' });
      return;
    }
    const msg = { id: nextId++, name: data.name, text: data.text };
    messages.push(msg);
    sendJson(res, 201, msg, { Location: `/api/messages/${msg.id}` });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/stats') {
    // stats.json が無ければ失敗する。失敗は下の try/catch で 500 にする
    const stats = JSON.parse(await fs.readFile(new URL('./stats.json', import.meta.url), 'utf8'));
    sendJson(res, 200, stats);
    return;
  }

  sendJson(res, 404, { error: 'ありません' });
}

const server = http.createServer(async (req, res) => {
  // 追加: ハンドラの中の失敗を、ここでまとめて 500 にする。サーバは止めない
  try {
    await handle(req, res);
  } catch (err) {
    console.error(`${req.method} ${req.url}:`, err);
    if (!res.headersSent) sendJson(res, 500, { error: 'サーバの中でエラーが起きました' });
    else res.destroy();
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
