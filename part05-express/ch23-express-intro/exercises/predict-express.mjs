// 練習問題4: Express が返すものを予想する
// 実行する前に、1〜14 のそれぞれについて「ステータスコード」と「本文」を予想して書き出してください。
//   $ node predict-express.mjs
// ポートは空いている番号を使う（listen(0)）。外部には何も送らない。
import express from 'express';

const app = express();
// 既定のエラーハンドラが、ターミナルにスタックトレースを書かないようにする（本文の動きは変わらない）
app.set('env', 'test');

app.use(express.json());

app.get('/items', (req, res) => res.json({ query: req.query }));
app.get('/items/:id', (req, res) => res.json({ params: req.params }));
app.get('/items/new', (req, res) => res.json({ page: 'new' }));
app.post('/items', (req, res) => res.status(201).json({ got: req.body ?? null }));
app.get('/n', (req, res) => res.send(201));
app.get('/twice', (req, res, next) => next());
app.get('/twice', (req, res) => res.send('2つ目'));
app.get('/async', async () => {
  const err = new Error('もうあります');
  err.status = 409;
  throw err;
});

const cases = [
  ['GET', '/items?a=1&a=2&b=x'], // 1
  ['GET', '/items/new'], // 2
  ['GET', '/Items/'], // 3
  ['PUT', '/items'], // 4
  ['OPTIONS', '/items/3'], // 5
  ['HEAD', '/items/3'], // 6
  ['POST', '/items', { 'content-type': 'application/json' }, '{"name":"りんご"}'], // 7
  ['POST', '/items', { 'content-type': 'text/plain' }, '{"name":"りんご"}'], // 8
  ['POST', '/items', { 'content-type': 'application/json' }, '{"name":'], // 9
  ['GET', '/n'], // 10
  ['GET', '/twice'], // 11
  ['GET', '/async'], // 12
  ['GET', '/items/%E3%82%8A%E3%82%93%E3%81%94'], // 13
  ['GET', '/items/a%2Fb'], // 14
];

const server = app.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [i, [method, path, headers, body]] of cases.entries()) {
    const res = await fetch(base + path, { method, headers, body, signal: AbortSignal.timeout(2000) });
    let text = await res.text();
    // HTML のエラーページは長いので、<pre> の中だけを出す
    const pre = /<pre>([\s\S]*?)<\/pre>/.exec(text);
    if (pre) text = `(HTML) ${pre[1].split('<br>')[0]}`;
    const allow = res.headers.get('allow') ? `  Allow: ${res.headers.get('allow')}` : '';
    console.log(`${String(i + 1).padStart(2)}. ${method} ${path} → ${res.status} ${JSON.stringify(text)}${allow}`);
  }
  server.close();
});
