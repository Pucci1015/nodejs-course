// 3節: CSP の nonce。リクエストごとに作った値を持つ <script> だけを動かす
// 動かし方: node samples/csp-nonce.ts   → ブラウザで http://127.0.0.1:9657/ を開き、DevTools の Console を見る
//          CSP_REPORT_ONLY=1 node samples/csp-nonce.ts   → 止めずに、Console に知らせるだけ
import { randomBytes } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';

const reportOnly = process.env.CSP_REPORT_ONLY === '1';
/** 応答ごとの nonce（helmet の関数は Express の res.locals の型を知らないので、ここに覚える） */
const nonces = new WeakMap<object, string>();

const app = express();

// 1. リクエストごとに nonce を作る（予想できないランダムな値。使い回さない）
app.use((_req, res, next) => {
  const nonce = randomBytes(16).toString('base64');
  nonces.set(res, nonce);
  res.locals.nonce = nonce;
  next();
});

// 2. CSP の script-src に、その nonce を書く（関数にすると、リクエストごとに呼ばれる）
app.use(
  helmet({
    contentSecurityPolicy: {
      reportOnly,
      directives: {
        scriptSrc: ["'self'", (_req, res) => `'nonce-${nonces.get(res) ?? ''}'`],
        // Report-Only では upgrade-insecure-requests は使えない（ブラウザが Console に注意を出す）ので外す
        ...(reportOnly ? { upgradeInsecureRequests: null } : {}),
      },
    },
  }),
);

app.get('/', (_req, res) => {
  const nonce = String(res.locals.nonce);
  res.type('html').send(`<!doctype html>
<meta charset="utf-8">
<title>CSP の nonce</title>
<ul id="log"></ul>
<button id="b1">addEventListener のボタン</button>
<button id="b2" onclick="document.getElementById('log').append('onclick が動きました')">onclick のボタン</button>
<script nonce="${nonce}">
  const log = (text) => { const li = document.createElement('li'); li.textContent = text; document.getElementById('log').append(li); };
  log('nonce 付きの script が動きました');
  document.getElementById('b1').addEventListener('click', () => log('addEventListener が動きました'));
</script>
<script>
  document.getElementById('log').append('nonce の無い script が動きました');
</script>
<script src="/app.js"></script>`);
});

// 同じオリジンのファイルは、script-src 'self' で動く
app.get('/app.js', (_req, res) => {
  res.type('js').send("document.getElementById('log').append(Object.assign(document.createElement('li'), { textContent: '/app.js が動きました' }));");
});

app.listen(9657, '127.0.0.1', () => console.log('http://127.0.0.1:9657'));
