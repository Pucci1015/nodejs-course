// pino で、1行1つの JSON のログを書く（第26章 6節）
//   $ node logging-demo.mjs
//   別のターミナルで:
//     curl -s http://127.0.0.1:9332/api/tasks
//     curl -s -H 'X-Request-Id: my-test-001' -H 'Authorization: Bearer dev-only-token' 'http://127.0.0.1:9332/api/tasks?token=abc'
//     curl -s http://127.0.0.1:9332/api/nothing
//     curl -s http://127.0.0.1:9332/api/boom
//   サーバのターミナルに出る JSON の行を見てください。Authorization と token の値は [redacted] になります
import crypto from 'node:crypto';
import express from 'express';
import pino from 'pino';

// ロガーは1つだけ作り、アプリ全体で使う
const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // ログに残してはいけない値（トークン、Cookie、パスワード）は、書く前に置き換える
  redact: { paths: ['req.headers.authorization', 'req.headers.cookie', '*.password'], censor: '[redacted]' },
});

const SECRET_QUERY = new Set(['token', 'password', 'secret', 'code', 'key']);
/** クエリの秘密の値を隠した URL（第24章 練習問題4と同じ考え方） */
function safeUrl(originalUrl) {
  const u = new URL(originalUrl, 'http://x');
  for (const name of [...u.searchParams.keys()]) if (SECRET_QUERY.has(name.toLowerCase())) u.searchParams.set(name, '[redacted]');
  try {
    return decodeURIComponent(u.pathname + u.search); // 読みやすくするために %xx を戻す
  } catch {
    return u.pathname + u.search; // 壊れた %xx のときは、そのまま（ここで例外を出すと、プロセスが落ちる）
  }
}

/** リクエストごとに id を決め、子のロガーを req.log に入れ、応答の後に1行書く */
function requestLogger() {
  return (req, res, next) => {
    // 前のプロキシが付けた id があれば使う（形を確かめる。ログに好きな文字を入れさせない）
    const given = req.get('x-request-id');
    req.id = given && /^[A-Za-z0-9._-]{1,64}$/.test(given) ? given : crypto.randomUUID();
    res.set('X-Request-Id', req.id); // 客にも返す。問い合わせのときに、この id でログを探せる
    req.log = logger.child({ reqId: req.id }); // このリクエストの中で書くログには、いつも reqId が付く
    const start = process.hrtime.bigint();
    res.once('close', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      const status = res.writableFinished ? res.statusCode : 'aborted';
      const level = status === 'aborted' || status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      req.log[level](
        { req: { method: req.method, url: safeUrl(req.originalUrl), headers: req.headers }, status, ms: Math.round(ms * 10) / 10 },
        'リクエストを処理しました',
      );
    });
    next();
  };
}

const app = express();
app.disable('x-powered-by');
app.use(requestLogger());

app.get('/api/tasks', (req, res) => {
  req.log.debug({ count: 2 }, 'タスクを読みました'); // LOG_LEVEL=debug のときだけ出る
  res.json({ items: [{ id: 1, title: '牛乳' }, { id: 2, title: '卵' }] });
});
app.get('/api/boom', () => {
  throw new Error('DB の接続が切れた');
});
app.use((req, res) => res.status(404).json({ error: 'not_found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  req.log.error({ err }, '予想していないエラー'); // err は pino が type・message・stack に分けて書く
  res.status(500).json({ error: 'internal', requestId: req.id });
});

app.listen(9332, '127.0.0.1', () => {
  logger.info({ port: 9332 }, '起動しました');
});
