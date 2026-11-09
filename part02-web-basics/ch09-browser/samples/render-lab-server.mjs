// スクリプトと CSS の読み込み方による、表示の違いを確かめるサーバ（第9章 3節）
// 使い方: node samples/render-lab-server.mjs [ポート]   既定: 8200
//   ブラウザで http://localhost:8200/ を開き、各ページを DevTools の Network タブと一緒に見る。
//
// /slow.js?ms=1000&name=A   1秒待ってから、「A を実行」とログに書く JavaScript を返す
// /slow.css?ms=1000         1秒待ってから CSS を返す
import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';

const port = Number(process.argv[2] ?? 8200);

// どのページにも入れる、時刻付きでログを書く仕組み。<head> の最初に置くので、他のスクリプトより先に動く
const LOGGER = `<script>
  window.logs = [];
  window.log = (msg) => {
    const line = (performance.now() / 1000).toFixed(2).padStart(5) + '秒  ' + msg;
    window.logs.push(msg);
    console.log(line);
    const add = () => { const li = document.createElement('li'); li.textContent = line; document.getElementById('log').append(li); };
    document.getElementById('log') ? add() : document.addEventListener('DOMContentLoaded', add);
  };
  document.addEventListener('DOMContentLoaded', () => log('DOMContentLoaded（HTML を最後まで解析した）'));
  addEventListener('load', () => log('load（画像や CSS なども含めて、すべて読み終えた）'));
  // 画面に最初に文字などが描かれた時刻（First Contentful Paint）を、分かった時点で書く
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.name === 'first-contentful-paint') log('★ 画面に最初に表示された（' + (e.startTime / 1000).toFixed(2) + '秒の時点）');
    }
  }).observe({ type: 'paint', buffered: true });
</script>`;

const page = (title, head, body) => `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${title}</title>
${LOGGER}
${head}
</head>
<body>
<p><a href="/">← 一覧へ</a></p>
<h1>${title}</h1>
<p>この文章が表示されるまでの時間に注目してください。</p>
${body}
<h2>ログ</h2>
<ol id="log"></ol>
<script>log('body の最後の、普通の（インライン）スクリプト');</script>
</body>
</html>
`;

const pages = {
  '/blocking': [
    '普通の script（head の中）',
    '<script src="/slow.js?ms=1500&name=head の普通の script"></script>',
    '',
  ],
  '/defer': [
    'defer 付きの script',
    '<script defer src="/slow.js?ms=1500&name=defer の script"></script>',
    '',
  ],
  '/async': [
    'async 付きの script',
    '<script async src="/slow.js?ms=1500&name=async の script"></script>',
    '',
  ],
  '/module': [
    'type="module" の script',
    '<script type="module" src="/slow.js?ms=1500&name=module の script"></script>',
    '',
  ],
  '/css': [
    '遅い CSS（head の中）',
    '<link rel="stylesheet" href="/slow.css?ms=1500">',
    '',
  ],
  '/body-end': [
    'body の最後の普通の script',
    '',
    '<script src="/slow.js?ms=1500&name=body の最後の普通の script"></script>',
  ],
  '/order': [
    '全部まぜたとき（練習問題4）',
    [
      '<script defer src="/slow.js?ms=300&name=defer A（300ms）"></script>',
      '<script defer src="/slow.js?ms=100&name=defer B（100ms）"></script>',
      '<script async src="/slow.js?ms=600&name=async C（600ms）"></script>',
      '<script async src="/slow.js?ms=50&name=async D（50ms）"></script>',
      '<script type="module" src="/slow.js?ms=10&name=module E（10ms）"></script>',
      '<script>log("head のインライン F")</script>',
    ].join('\n'),
    '<script src="/slow.js?ms=200&name=body の普通の G（200ms）"></script>',
  ],
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const ms = Math.min(Number(url.searchParams.get('ms') ?? 0), 10_000);

    if (url.pathname === '/slow.js') {
      await sleep(ms);
      const name = url.searchParams.get('name') ?? '?';
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(`log(${JSON.stringify(`${name} を実行`)});\n`);
      return;
    }
    if (url.pathname === '/slow.css') {
      await sleep(ms);
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('h1 { color: #2a6f97; }\n');
      return;
    }
    if (pages[url.pathname]) {
      const [title, head, body] = pages[url.pathname];
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(page(title, head, body));
      return;
    }
    if (url.pathname === '/') {
      const links = Object.entries(pages)
        .map(([path, [title]]) => `<li><a href="${path}">${path}</a> ${title}</li>`)
        .join('\n');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html><html lang="ja"><meta charset="utf-8"><title>第9章 表示の実験</title>
<h1>第9章 表示の実験</h1><p>DevTools を開いた状態で、各ページを開いてください。</p><ul>${links}</ul></html>\n`);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('見つかりません\n');
  })
  .listen(port, '127.0.0.1', () => console.log(`http://localhost:${port}/ で待ち受けています（Ctrl + C で終了）`));
