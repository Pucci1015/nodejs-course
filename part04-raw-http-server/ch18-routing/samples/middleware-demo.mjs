// ミドルウェア: ハンドラの前後に、共通の処理をはさむ（第18章 8節）
// 使い方: node middleware-demo.mjs
//   curl -i http://127.0.0.1:9182/hello
//   curl -i http://127.0.0.1:9182/private                          → 401
//   curl -i -H 'Authorization: Bearer demo' http://127.0.0.1:9182/private
import http from 'node:http';
import { sendJson, sendText } from '../../ch17-minimal-server/solutions/send.mjs';

const PORT = 9182;

// ミドルウェアは (req, res, next) を受け取る。next() を呼ぶと、次のミドルウェア（最後はハンドラ）が動く
const timing = async (req, res, next) => {
  const start = performance.now();
  await next(); // 後ろが全部終わるまで待つ
  console.log(`${req.method} ${req.url} ${res.statusCode} ${(performance.now() - start).toFixed(1)}ms`);
};

const poweredBy = (req, res, next) => {
  res.setHeader('X-Powered-By', 'handmade'); // 後ろのハンドラが返す前に、ヘッダを足しておく
  return next();
};

// 練習用の決まった値。本物の認証は第10部で
// 生の req.url ではなく、URL で直した pathname で調べる（練習問題4の //x/admin のような書き方で、すり抜けられないように）
const auth = (req, res, next) => {
  if (req.pathname !== '/private' && !req.pathname.startsWith('/private/')) return next();
  if (req.headers.authorization !== 'Bearer demo') {
    sendJson(res, 401, { error: 'ログインが必要です' }); // next を呼ばない = ここで終わり
    return;
  }
  req.user = 'demo';
  return next();
};

const handler = (req, res) => {
  if (req.pathname === '/private') return sendText(res, 200, `${req.user} さんの秘密のページ\n`);
  return sendText(res, 200, 'こんにちは\n');
};

// いちばん簡単なつなぎ方。練習問題6で、ちゃんとした compose を作る
const middlewares = [timing, poweredBy, auth];
function run(req, res, i = 0) {
  if (i === middlewares.length) return handler(req, res);
  return middlewares[i](req, res, () => run(req, res, i + 1));
}

const server = http.createServer(async (req, res) => {
  req.pathname = new URL(`http://localhost${req.url}`).pathname;
  try {
    await run(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendJson(res, 500, { error: 'Internal Server Error' });
  }
});
server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
