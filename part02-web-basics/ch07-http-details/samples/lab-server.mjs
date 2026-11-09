// 第7章の実験用サーバ: 文字コード・Cookie・リダイレクト・キャッシュ・圧縮・ネゴシエーションを試す
// 使い方: node lab-server.mjs [ポート]   既定: 8100
//   ブラウザで http://localhost:8100/ を開くと、実験の一覧が表示される。
//   curl でも試せる（各節のコマンドは本文を参照）。
import http from 'node:http';
import zlib from 'node:zlib';
import { encodeShiftJis } from './sjis.mjs';

const port = Number(process.argv[2] ?? 8100);
const startedAt = new Date();
startedAt.setMilliseconds(0); // Last-Modified は秒までしか表せないので、ミリ秒を切り捨てる

/** レスポンスを送る小さな関数。body が文字列なら UTF-8 にする */
function send(res, status, headers, body = '') {
  const bytes = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
  res.writeHead(status, { 'Content-Length': bytes.length, ...headers });
  res.end(bytes);
}

const html = (title, body) =>
  `<!doctype html>\n<html lang="ja">\n<head><meta charset="utf-8"><title>${title}</title></head>\n<body>\n${body}\n</body>\n</html>\n`;

/** Cookie ヘッダ「a=1; b=2」を { a: '1', b: '2' } にする */
function parseCookies(header = '') {
  const cookies = {};
  for (const pair of header.split(';')) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    cookies[pair.slice(0, eq).trim()] = decodeURIComponent(pair.slice(eq + 1).trim());
  }
  return cookies;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

// ---- 2節 文字コード ----
const greetingHtml = (meta) =>
  `<!doctype html>\n<html lang="ja">\n<head>${meta}<title>文字コードの実験</title></head>\n` +
  '<body><p>こんにちは、世界。日本語は正しく表示されていますか？</p></body>\n</html>\n';

const charsetCases = {
  // パス: [Content-Type ヘッダ, HTML の中の meta, ボディの文字コード]
  'utf8': ['text/html; charset=utf-8', '<meta charset="utf-8">', 'utf8'],
  'utf8-no-charset': ['text/html', '', 'utf8'],
  'sjis': ['text/html; charset=shift_jis', '', 'sjis'],
  'sjis-no-charset': ['text/html', '', 'sjis'],
  'sjis-meta': ['text/html', '<meta charset="shift_jis">', 'sjis'],
  'conflict': ['text/html; charset=utf-8', '<meta charset="shift_jis">', 'sjis'],
  'plain-no-charset': ['text/plain', '', 'utf8'],
};

function charset(res, name) {
  const c = charsetCases[name];
  if (!c) return false;
  const [type, meta, enc] = c;
  const text = type.startsWith('text/plain') ? 'こんにちは、世界。\n' : greetingHtml(meta);
  send(res, 200, { 'Content-Type': type }, enc === 'sjis' ? encodeShiftJis(text) : text);
  return true;
}

// ---- 5節 キャッシュ ----
// 30秒ごとに中身が変わるリソース。ETag は中身の版
function cacheVersion() {
  return Math.floor(Date.now() / 30_000) % 1000;
}

// ---- 6節 圧縮 ----
const bigJson = JSON.stringify(
  Array.from({ length: 500 }, (_, i) => ({ id: i + 1, title: `タスク ${i + 1}`, done: i % 3 === 0, tags: ['仕事', '急ぎ'] })),
);

// ---- 7節 ネゴシエーション ----
/** Accept-Language「ja,en-US;q=0.9,en;q=0.8」から、対応している言語のうち最も好まれるものを選ぶ */
function pickLanguage(header = '', supported = ['ja', 'en'], fallback = 'en') {
  const prefs = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      return { lang: tag.trim().toLowerCase().split('-')[0], q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((p) => p.lang && p.q > 0)
    .sort((a, b) => b.q - a.q);
  return prefs.find((p) => supported.includes(p.lang))?.lang ?? fallback;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname;
  console.log(`${req.method} ${req.url}`);

  // ---- 実験の一覧 ----
  if (path === '/') {
    const links = (items) => items.map(([href, label]) => `<li><a href="${href}">${href}</a> ${label}</li>`).join('\n');
    send(res, 200, { 'Content-Type': 'text/html; charset=utf-8' }, html('第7章 実験用サーバ', `
<h1>第7章 実験用サーバ</h1>
<p>DevTools（⌘ + ⌥ + I）の Network タブを開いた状態で試してください。</p>
<h2>2. 文字コード</h2>
<ul>${links(Object.entries(charsetCases).map(([k, [t, m, e]]) => [`/charset/${k}`, `（ヘッダ: ${t} / meta: ${m ? m.replace(/[<>"]/g, '') : 'なし'} / 中身: ${e === 'sjis' ? 'Shift_JIS' : 'UTF-8'}）`]))}</ul>
<h2>3. Cookie</h2>
<ul>${links([['/cookie', '訪問回数を Cookie で数える'], ['/cookie/clear', 'Cookie を消す']])}</ul>
<h2>4. リダイレクト</h2>
<ul>${links([301, 302, 303, 307, 308].map((c) => [`/redirect/${c}`, `→ /echo へ ${c} でリダイレクト`]))}</ul>
${[301, 302, 303, 307, 308].map((c) => `<form method="post" action="/redirect/${c}" style="display:inline"><input type="hidden" name="memo" value="テスト"><button>POST して ${c}</button></form>`).join('\n')}
<h2>5. キャッシュ</h2>
<ul>${links([['/cache/max-age', 'Cache-Control: max-age=10'], ['/cache/no-store', 'Cache-Control: no-store'], ['/cache/etag', 'ETag（30秒ごとに中身が変わる）'], ['/cache/last-modified', 'Last-Modified']])}</ul>
<h2>6. 圧縮</h2>
<ul>${links([['/compress', 'Accept-Encoding に応じて gzip / br で圧縮']])}</ul>
<h2>7. ネゴシエーション</h2>
<ul>${links([['/greet', 'Accept と Accept-Language に応じて返すものを変える']])}</ul>
`));
    return;
  }

  // ---- 2節 文字コード ----
  if (path.startsWith('/charset/') && charset(res, path.slice('/charset/'.length))) return;

  // ---- 3節 Cookie ----
  if (path === '/cookie') {
    const cookies = parseCookies(req.headers.cookie);
    const visits = Number(cookies.visits ?? 0) + 1;
    send(
      res,
      200,
      {
        'Content-Type': 'text/plain; charset=utf-8',
        // Max-Age は秒。HttpOnly は JavaScript から読めなくする。SameSite は第9章
        'Set-Cookie': `visits=${visits}; Max-Age=600; Path=/; HttpOnly; SameSite=Lax`,
      },
      `${visits} 回目の訪問です。\n届いた Cookie ヘッダ: ${req.headers.cookie ?? '（なし）'}\n`,
    );
    return;
  }
  if (path === '/cookie/clear') {
    // 同じ名前・同じ Path で Max-Age=0 を送ると、ブラウザは Cookie を消す
    send(res, 200, { 'Content-Type': 'text/plain; charset=utf-8', 'Set-Cookie': 'visits=; Max-Age=0; Path=/' }, 'Cookie を消しました\n');
    return;
  }

  // ---- 4節 リダイレクト ----
  const redirect = path.match(/^\/redirect\/(301|302|303|307|308)$/);
  if (redirect) {
    await readBody(req); // ボディは読んで捨てる
    send(res, Number(redirect[1]), { Location: '/echo', 'Content-Type': 'text/plain; charset=utf-8' }, `/echo へ移動しました\n`);
    return;
  }
  if (path === '/echo') {
    const body = await readBody(req);
    send(res, 200, { 'Content-Type': 'text/plain; charset=utf-8' }, `メソッド: ${req.method}\nボディ: ${body || '（なし）'}\n`);
    return;
  }

  // ---- 5節 キャッシュ ----
  if (path === '/cache/max-age') {
    send(res, 200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'max-age=10' }, `作った時刻: ${new Date().toLocaleTimeString('ja-JP')}\n`);
    return;
  }
  if (path === '/cache/no-store') {
    send(res, 200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, `作った時刻: ${new Date().toLocaleTimeString('ja-JP')}\n`);
    return;
  }
  if (path === '/cache/etag') {
    const version = cacheVersion();
    const etag = `"v${version}"`;
    const headers = { ETag: etag, 'Cache-Control': 'no-cache' }; // no-cache は「使う前に必ず確認」
    if (req.headers['if-none-match'] === etag) {
      send(res, 304, headers); // 変わっていない。ボディは送らない
      return;
    }
    send(res, 200, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }, `版 ${version}（30秒ごとに変わります）。作った時刻: ${new Date().toLocaleTimeString('ja-JP')}\n`);
    return;
  }
  if (path === '/cache/last-modified') {
    const headers = { 'Last-Modified': startedAt.toUTCString(), 'Cache-Control': 'no-cache' };
    const since = Date.parse(req.headers['if-modified-since'] ?? '');
    if (!Number.isNaN(since) && startedAt.getTime() <= since) {
      send(res, 304, headers);
      return;
    }
    send(res, 200, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }, `サーバを起動した時刻から変わっていません: ${startedAt.toLocaleString('ja-JP')}\n`);
    return;
  }

  // ---- 6節 圧縮 ----
  if (path === '/compress') {
    const accept = req.headers['accept-encoding'] ?? '';
    const headers = { 'Content-Type': 'application/json; charset=utf-8', Vary: 'Accept-Encoding' };
    // 簡単のため q 値は見ずに、br → gzip → 圧縮なし の順に選ぶ
    if (/\bbr\b/.test(accept)) {
      send(res, 200, { ...headers, 'Content-Encoding': 'br' }, zlib.brotliCompressSync(bigJson));
    } else if (/\bgzip\b/.test(accept)) {
      send(res, 200, { ...headers, 'Content-Encoding': 'gzip' }, zlib.gzipSync(bigJson));
    } else {
      send(res, 200, headers, bigJson);
    }
    return;
  }

  // ---- 7節 ネゴシエーション ----
  if (path === '/greet') {
    const lang = pickLanguage(req.headers['accept-language']);
    const message = { ja: 'こんにちは', en: 'Hello' }[lang];
    const wantsJson = (req.headers.accept ?? '').includes('application/json');
    const headers = { 'Content-Language': lang, Vary: 'Accept, Accept-Language' };
    if (wantsJson) {
      send(res, 200, { ...headers, 'Content-Type': 'application/json; charset=utf-8' }, `${JSON.stringify({ lang, message })}\n`);
    } else {
      send(res, 200, { ...headers, 'Content-Type': 'text/html; charset=utf-8' }, html(message, `<h1>${message}</h1>`));
    }
    return;
  }

  send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, '見つかりません\n');
});

server.listen(port, '127.0.0.1', () => console.log(`http://localhost:${port}/ で待ち受けています（Ctrl + C で終了）`));
