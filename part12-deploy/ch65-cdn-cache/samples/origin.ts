// 第65章 2〜6節: CDN の後ろに置くオリジン（アプリ）。頼みが来るたびに、ターミナルに1行出す
// 動かし方（章のフォルダで）: node samples/origin.ts   → http://127.0.0.1:9857/
//   MISTAKE=1 を付けると、/api/me を間違えて public にする（6節）
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = 9857;
const CDN_PURGE_URL = process.env.CDN_PURGE_URL ?? 'http://127.0.0.1:9858/__purge';
const PURGE_TOKEN = process.env.PURGE_TOKEN ?? 'dev-only-purge-token';

const appJs = 'document.querySelector("#out").textContent = "app.js を読みました";\n';
const appJsName = `app.${crypto.createHash('sha256').update(appJs).digest('hex').slice(0, 8)}.js`;
const indexHtml = `<!doctype html>
<meta charset="utf-8">
<title>第65章</title>
<p id="out">読み込み中</p>
<script src="/assets/${appJsName}"></script>
`;
const tasks = new Map([
  ['1', { id: 1, title: '牛乳を買う' }],
  ['2', { id: 2, title: '第65章を読む' }],
]);
let statsCount = 0;

function etagOf(body: string): string {
  return `"${crypto.createHash('sha256').update(body).digest('hex').slice(0, 16)}"`;
}

/** 本文と ETag を付けて返す。客が同じ版を持っていれば 304 */
function sendWithEtag(req: http.IncomingMessage, res: http.ServerResponse, type: string, body: string) {
  const etag = etagOf(body);
  res.setHeader('ETag', etag);
  res.setHeader('Content-Type', type);
  if (req.headers['if-none-match'] === etag) {
    res.statusCode = 304;
    res.end();
    return;
  }
  res.end(body);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  (async () => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    console.log(`origin: ${req.method} ${url.pathname}${req.headers['if-none-match'] ? '（If-None-Match 付き）' : ''}`);

    if (url.pathname === '/') {
      // HTML: 毎回確かめる。中の JS の名前が変わったら、すぐ分かるように
      res.setHeader('Cache-Control', 'no-cache');
      return sendWithEtag(req, res, 'text/html; charset=utf-8', indexHtml);
    }
    if (url.pathname === `/assets/${appJsName}`) {
      // 名前に中身のハッシュが入ったファイル: 1年、確かめずに使ってよい
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return sendWithEtag(req, res, 'text/javascript; charset=utf-8', appJs);
    }
    if (url.pathname === '/api/stats') {
      // みんなに同じ。少し古くてもよい。作るのに時間がかかる（0.5 秒）
      await sleep(500);
      statsCount += 1;
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=30');
      res.setHeader('Cache-Tag', 'stats');
      return sendWithEtag(req, res, 'application/json', JSON.stringify({ tasks: tasks.size, generated: statsCount }) + '\n');
    }
    if (url.pathname === '/api/greeting') {
      // 言語ごとに違う。Vary で「Accept-Language ごとに別々に覚えて」と伝える
      const ja = (req.headers['accept-language'] ?? '').startsWith('ja');
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
      res.setHeader('Vary', 'Accept-Language');
      return sendWithEtag(req, res, 'text/plain; charset=utf-8', ja ? 'こんにちは\n' : 'Hello\n');
    }
    if (url.pathname === '/api/me') {
      // 人ごとに違う。CDN に覚えさせてはいけない
      const user = /(?:^|;\s*)user=(\w+)/.exec(req.headers.cookie ?? '')?.[1] ?? 'ゲスト';
      res.setHeader('Cache-Control', process.env.MISTAKE === '1' ? 'public, max-age=60' : 'private, no-store');
      return sendWithEtag(req, res, 'application/json', JSON.stringify({ user }) + '\n');
    }
    const m = /^\/api\/tasks\/(\d+)$/.exec(url.pathname);
    const task = m ? tasks.get(m[1] ?? '') : undefined;
    if (m && task && req.method === 'GET') {
      // CDN では 1 分覚えてよい。変わったら、印（Cache-Tag）で消す
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
      res.setHeader('Cache-Tag', `task-${task.id}, tasks`);
      return sendWithEtag(req, res, 'application/json', JSON.stringify(task) + '\n');
    }
    if (m && task && req.method === 'PUT') {
      // 題名を変えて、CDN に「この印のものを消して」と頼む
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      task.title = Buffer.concat(chunks).toString('utf8').trim();
      const r = await fetch(CDN_PURGE_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${PURGE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: [`task-${task.id}`, 'stats'] }),
        signal: AbortSignal.timeout(2000),
      });
      console.log(`origin: CDN に消すよう頼みました（${r.status}）`);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(task) + '\n');
      return;
    }
    res.statusCode = 404;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('見つかりません\n');
  })().catch((err: unknown) => {
    console.error(err);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`オリジン: http://127.0.0.1:${PORT}/ （JS は /assets/${appJsName}）`);
});
