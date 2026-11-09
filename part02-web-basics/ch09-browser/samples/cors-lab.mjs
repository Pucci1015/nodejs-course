// 同一オリジンポリシーと CORS を確かめる実験（第9章 4〜5節）
// 使い方: node samples/cors-lab.mjs
//   2つのサーバを起動する:
//     画面のサーバ  http://localhost:8300/  （ボタンを押すと、API のサーバに fetch する）
//     API のサーバ  http://localhost:8301/  （オリジンが違う。ポート番号が違うだけでも別のオリジン）
//   API のサーバのターミナルには、ブラウザに止められたリクエストも表示される。
import http from 'node:http';
import crypto from 'node:crypto';

const FRONT_ORIGIN = 'http://localhost:8300';
const API_ORIGIN = 'http://localhost:8301';

// ---------------- 画面のサーバ ----------------
const experiments = [
  ['no-cors', 'CORS のヘッダが無い API を GET', `fetch('${API_ORIGIN}/api/no-cors')`],
  ['simple', 'Access-Control-Allow-Origin が画面のオリジンの API を GET', `fetch('${API_ORIGIN}/api/simple')`],
  ['star', 'Access-Control-Allow-Origin: * の API を GET', `fetch('${API_ORIGIN}/api/star')`],
  ['no-cors-mode', 'CORS のヘッダが無い API を mode: "no-cors" で GET', `fetch('${API_ORIGIN}/api/no-cors', { mode: 'no-cors' })`],
  ['put', 'PUT と JSON（プリフライトが必要）', `fetch('${API_ORIGIN}/api/preflight', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Token': 'abc' }, body: JSON.stringify({ title: '牛乳' }) })`],
  ['put-no-preflight', 'PUT と JSON（プリフライトに答えない API）', `fetch('${API_ORIGIN}/api/simple', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' })`],
  ['post-form', 'POST（フォームと同じ形式。プリフライト無し）を CORS の無い API へ', `fetch('${API_ORIGIN}/api/no-cors', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'memo=1' })`],
  ['me', 'Cookie 付き（credentials: "include"）で、正しく設定した API へ', `fetch('${API_ORIGIN}/api/me', { credentials: 'include' })`],
  ['me-star', 'Cookie 付きで、Access-Control-Allow-Origin: * の API へ', `fetch('${API_ORIGIN}/api/me-star', { credentials: 'include' })`],
  ['me-no-credentials', 'Cookie を付けずに（既定）、/api/me へ', `fetch('${API_ORIGIN}/api/me')`],
];

const frontPage = `<!doctype html>
<html lang="ja">
<head><meta charset="utf-8"><title>CORS の実験</title>
<style>
  body { font-family: -apple-system, "Hiragino Sans", sans-serif; margin: 2rem; max-width: 60rem; }
  li { margin: .6rem 0; } code { font-size: .8rem; color: #555; display: block; }
  .ok { color: #1a7f37; } .ng { color: #cf222e; } output { display: block; white-space: pre-wrap; }
</style></head>
<body>
<h1>CORS の実験</h1>
<p>このページのオリジンは <b>${FRONT_ORIGIN}</b>、API のオリジンは <b>${API_ORIGIN}</b> です。
DevTools の Console と Network タブを開いてから、ボタンを押してください。</p>
<p>Cookie の実験の前に、<a href="${API_ORIGIN}/api/login" target="_blank">API のサーバでログイン</a>（API のオリジンに Cookie を作る）してください。</p>
<ol>
${experiments
  .map(
    ([id, label, code]) => `<li><button data-id="${id}">${label}</button><code>${code.replace(/</g, '&lt;')}</code><output id="out-${id}"></output></li>`,
  )
  .join('\n')}
</ol>
<script>
  const experiments = {
${experiments.map(([id, , code]) => `    ${JSON.stringify(id)}: () => ${code},`).join('\n')}
  };
  async function run(id) {
    const out = document.getElementById('out-' + id);
    try {
      const res = await experiments[id]();
      // mode: 'no-cors' の結果は「中身の見えないレスポンス」（opaque）になる
      const text = res.type === 'opaque' ? '（中身は読めない: type=opaque, status=' + res.status + '）' : await res.text();
      out.className = 'ok';
      out.textContent = '成功 ' + res.status + ': ' + text;
    } catch (err) {
      out.className = 'ng';
      out.textContent = '失敗: ' + err.name + ': ' + err.message + '（理由は Console を見る）';
    }
    return out.textContent;
  }
  for (const b of document.querySelectorAll('button')) b.addEventListener('click', () => run(b.dataset.id));
  window.run = run; // 自動テストからも呼べるように
</script>
</body>
</html>
`;

http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(frontPage);
  })
  .listen(8300, '127.0.0.1', () => console.log(`画面のサーバ: ${FRONT_ORIGIN}/`));

// ---------------- API のサーバ ----------------
function json(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(`${JSON.stringify(data)}\n`);
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((p) => p.trim().split('='))
      .filter(([k]) => k),
  );
}

http
  .createServer((req, res) => {
    const origin = req.headers.origin;
    const path = new URL(req.url, API_ORIGIN).pathname;
    // ブラウザが結果を「止める」ときも、リクエスト自体はここまで届いていることに注目
    console.log(`[API] ${req.method.padEnd(7)} ${path.padEnd(16)} Origin: ${origin ?? '（なし）'}  Cookie: ${req.headers.cookie ?? '（なし）'}`);

    const allowFront = { 'Access-Control-Allow-Origin': FRONT_ORIGIN, Vary: 'Origin' };

    switch (path) {
      case '/api/no-cors':
        return json(res, 200, { message: 'CORS のヘッダは付けていません' });
      case '/api/simple':
        return json(res, 200, { message: `${FRONT_ORIGIN} からの読み取りを許可しています` }, allowFront);
      case '/api/star':
        return json(res, 200, { message: 'どのオリジンからの読み取りも許可しています' }, { 'Access-Control-Allow-Origin': '*' });
      case '/api/preflight':
        if (req.method === 'OPTIONS') {
          // プリフライト: 「この方法で送ってもよいか」への答え。ボディは不要
          res.writeHead(204, {
            ...allowFront,
            'Access-Control-Allow-Methods': 'GET, PUT, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type, X-Token',
            'Access-Control-Max-Age': '10', // この答えを10秒間覚えておいてよい
          });
          return res.end();
        }
        return json(res, 200, { message: `${req.method} を受け付けました` }, allowFront);
      case '/api/login': {
        // API のオリジンに Cookie を作る。localhost:8300 と localhost:8301 は「同じサイト」なので SameSite=Lax でも送られる
        const sid = crypto.randomBytes(8).toString('hex');
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Set-Cookie': `api_session=${sid}; Path=/; HttpOnly; SameSite=Lax`,
        });
        return res.end(`<!doctype html><meta charset="utf-8"><p>ログインしました（api_session=${sid}）。元のタブに戻って実験を続けてください。</p>\n`);
      }
      case '/api/me': {
        const session = parseCookies(req.headers.cookie).api_session;
        return json(res, 200, { session: session ?? null }, { ...allowFront, 'Access-Control-Allow-Credentials': 'true' });
      }
      case '/api/me-star': {
        const session = parseCookies(req.headers.cookie).api_session;
        return json(res, 200, { session: session ?? null }, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': 'true' });
      }
      default:
        return json(res, 404, { error: 'not found' });
    }
  })
  .listen(8301, '127.0.0.1', () => console.log(`API のサーバ: ${API_ORIGIN}/`));
