// 第46章 2節: SSR のサーバ。ページを開くたびに、API からデータを読み、React で HTML を作って返す
//   準備: npx vite build --outDir dist/client && npx vite build --ssr src/entry-server.tsx --outDir dist/server
//   起動: node server.ts（http://localhost:5173/ 。練習用の API を先に動かしておく）
import { readFileSync } from 'node:fs';
import express from 'express';
import type { PageData, Task } from './src/data.ts';
import { matchRoute } from './src/data.ts';

const API = 'http://127.0.0.1:9500/api';
const template = readFileSync(new URL('./dist/client/index.html', import.meta.url), 'utf8');
// サーバ用にビルドした entry-server（型は、元の .tsx から借りる）
const server = (await import(new URL('./dist/server/entry-server.js', import.meta.url).href)) as typeof import('./src/entry-server.tsx');

// <script> の中に JSON を入れるとき、< を < にする（題名の中の </script> で、script が途中で終わらないように）
function serialize(data: unknown): string {
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}

const escapeHtml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

async function loadData(pathname: string): Promise<PageData> {
  const route = matchRoute(pathname);
  const data: PageData = { route, tasks: [], task: null, renderedAt: new Date().toISOString() };
  if (route.name === 'list') {
    const res = await fetch(`${API}/tasks?sort=dueDate&limit=100`);
    if (!res.ok) throw new Error(`API: HTTP ${res.status}`);
    data.tasks = ((await res.json()) as { items: Task[] }).items;
  } else if (route.name === 'task') {
    const res = await fetch(`${API}/tasks/${route.id}`);
    if (res.ok) data.task = (await res.json()) as Task;
    else if (res.status !== 404) throw new Error(`API: HTTP ${res.status}`);
  }
  return data;
}

const app = express();
// ビルドしたファイル（JavaScript・CSS）。index.html は、下で自分で作るので配らない
app.use(express.static(new URL('./dist/client', import.meta.url).pathname, { index: false }));

// 6節: ストリーミング。集計を 2 秒かけて作る（遅い計算のかわり）
app.get('/stream', (_req, res) => {
  const stats = fetch(`${API}/tasks?limit=100`)
    .then((r) => r.json() as Promise<{ items: Task[] }>)
    .then(async ({ items }) => {
      await new Promise((r) => setTimeout(r, 2000));
      return { total: items.length, done: items.filter((t) => t.status === 'done').length };
    });
  res.type('html');
  server.renderStats(stats, res, (e) => console.error(e));
});

app.get('/{*path}', async (req, res) => {
  let data: PageData;
  try {
    data = await loadData(req.path);
  } catch (e) {
    console.error(e);
    res.status(502).type('text').send('API からデータを読めませんでした');
    return;
  }
  try {
    const { html, title, status } = server.render(data);
    const page = template
      .replace('<!--app-title-->', escapeHtml(title))
      .replace('<!--app-html-->', html)
      .replace('<!--app-data-->', `<script id="page-data" type="application/json">${serialize(data)}</script>`);
    res.status(status).type('html').send(page);
  } catch (e) {
    // 部品を描いている途中の例外（サーバには window も document も無い。4.2節）
    console.error(e);
    res.status(500).type('text').send('ページを作れませんでした');
  }
});

app.listen(5173, 'localhost', () => console.log('SSR のサーバ: http://localhost:5173/ （止めるのは Ctrl+C）'));
