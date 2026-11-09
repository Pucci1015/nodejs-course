// 練習問題6: 第18章の Router と Express のルーティングを比べる
// 同じルート（GET /tasks、POST /tasks、GET /tasks/:id、GET /tasks/me）を両方に登録し、同じリクエストを送って並べます。
//   $ node compare-routers.mjs
//   $ STRICT=1 node compare-routers.mjs      ← Express に strict routing と case sensitive routing を設定する
// ポートは空いている番号を使う（listen(0)）。
import http from 'node:http';
import express from 'express';
import { createApp } from '../../lib/http-app.mjs';
import { Router } from '../../lib/router.mjs';
import { sendJson } from '../../lib/send.mjs';

// ---- 第18章の Router（第17章の createApp で包む） ----
const ours = new Router();
ours.get('/tasks', (req, res) => sendJson(res, 200, { route: 'list' }));
ours.post('/tasks', (req, res) => sendJson(res, 201, { route: 'create' }));
ours.get('/tasks/:id', (req, res, p) => sendJson(res, 200, { route: 'show', id: p.id }));
ours.get('/tasks/me', (req, res) => sendJson(res, 200, { route: 'me' }));
const quiet = { info() {}, error() {} };
const ourServer = http.createServer(createApp(ours.handle, { logger: quiet }));

// ---- Express（登録の順番も同じ） ----
const app = express();
app.set('env', 'test');
if (process.env.STRICT) {
  app.set('strict routing', true); // 最後の / を区別する
  app.set('case sensitive routing', true); // 大文字と小文字を区別する
}
app.get('/tasks', (req, res) => res.json({ route: 'list' }));
app.post('/tasks', (req, res) => res.status(201).json({ route: 'create' }));
app.get('/tasks/:id', (req, res) => res.json({ route: 'show', id: req.params.id }));
app.get('/tasks/me', (req, res) => res.json({ route: 'me' }));
const expressServer = http.createServer(app);

const cases = [
  ['GET', '/tasks'],
  ['GET', '/tasks/'],
  ['GET', '/Tasks'],
  ['GET', '/tasks/me'],
  ['GET', '/tasks/7'],
  ['GET', '/tasks/caf%C3%A9'],
  ['GET', '/tasks/a%2Fb'],
  ['GET', '/tasks/%zz'],
  ['DELETE', '/tasks'],
  ['OPTIONS', '/tasks'],
  ['HEAD', '/tasks/7'],
  ['GET', '/tasks/7/'],
];

const listen = (s) => new Promise((resolve) => s.listen(0, '127.0.0.1', () => resolve(s.address().port)));
const [p1, p2] = await Promise.all([listen(ourServer), listen(expressServer)]);

async function describe(port, method, path) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, { method, redirect: 'manual', signal: AbortSignal.timeout(2000) });
  const text = await res.text();
  let short = '';
  try {
    const j = JSON.parse(text);
    short = j.route ? `${j.route}${j.id !== undefined ? ` id=${j.id}` : ''}` : (j.error ?? '');
  } catch {
    const pre = /<pre>([\s\S]*?)<\/pre>/.exec(text); // Express の既定のエラーページは <pre> の中に文がある
    short = (pre ? `(HTML) ${pre[1].split('<br>')[0]}` : text).replace(/\s+/g, ' ').trim().slice(0, 30);
  }
  const extra = [res.headers.get('location') && `Location: ${res.headers.get('location')}`, res.headers.get('allow') && `Allow: ${res.headers.get('allow')}`]
    .filter(Boolean)
    .join(' ');
  return `${res.status} ${short} ${extra}`.trim();
}

console.log(`Express の設定: ${process.env.STRICT ? 'strict routing・case sensitive routing を有効' : '既定'}`);
console.log(`${'リクエスト'.padEnd(26)} | ${'第18章の Router'.padEnd(40)} | Express`);
for (const [method, path] of cases) {
  const [a, b] = await Promise.all([describe(p1, method, path), describe(p2, method, path)]);
  // ステータスコードが違うものに *、ステータスは同じで選ばれたルートが違うものに ~ を付ける
  const mark = a.split(' ')[0] !== b.split(' ')[0] ? '*' : a.startsWith('200') && a !== b ? '~' : ' ';
  console.log(`${mark} ${`${method} ${path}`.padEnd(24)} | ${a.padEnd(40)} | ${b}`);
}
ourServer.close();
expressServer.close();
