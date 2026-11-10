// 例外とエラーハンドラ（第23章 8節）
//   $ node error-demo.mjs                       ← 開発のつもり。既定のエラーハンドラはスタックトレースを返す
//   $ NODE_ENV=production node error-demo.mjs   ← 既定のエラーハンドラは、ステータスの名前だけを返す
//   $ CUSTOM=1 node error-demo.mjs              ← 自分のエラーハンドラ（JSON）を使う
//   別のターミナルで:
//     curl -i http://127.0.0.1:9305/sync        curl -i http://127.0.0.1:9305/async
//     curl -i http://127.0.0.1:9305/teapot      curl -i http://127.0.0.1:9305/callback
//     curl -i http://127.0.0.1:9305/nothing
import express from 'express';

const app = express();

// 1. 同期の throw: Express が受け止めて、エラーハンドラへ送る
app.get('/sync', (req, res) => {
  throw new Error('DB に接続できません: postgres://app:dev-only-password@127.0.0.1/app'); // わざと「外に出してはいけない」文にした
});

// 2. async 関数の throw（Promise の reject）: Express 5 は受け止める。Express 4 は受け止めなかった
app.get('/async', async (req, res) => {
  await new Promise((r) => setTimeout(r, 10));
  throw new Error('async の中で失敗');
});

// 3. err.status（か err.statusCode）があれば、そのステータスになる
app.get('/teapot', (req, res) => {
  const err = new Error('ティーポットなのでコーヒーは入れられません');
  err.status = 418;
  throw err;
});

// 4. コールバックの中の throw は、Express には届かない（プロセスが落ちる）。next(err) で渡す
app.get('/callback', (req, res, next) => {
  setTimeout(() => {
    try {
      throw new Error('setTimeout の中で失敗');
    } catch (err) {
      next(err); // これを書かずに throw すると、uncaughtException でサーバが止まる
    }
  }, 10);
});

if (process.env.CUSTOM) {
  // どのルートにもあてはまらなかったとき（404）。ルートをすべて書いた後に置く
  app.use((req, res) => {
    res.status(404).json({ error: 'not_found', message: `${req.method} ${req.path} はありません` });
  });
  // 引数が4つの関数が、エラーハンドラ。これも最後に置く
  app.use((err, req, res, next) => {
    const status = err.status ?? err.statusCode ?? 500;
    if (status >= 500) console.error(err); // 500 番台は、詳しいことはログにだけ書く
    if (res.headersSent) return next(err); // 途中まで送ってしまった後なら、Express に任せる（接続を切る）
    res.status(status).json({
      error: status >= 500 ? 'internal' : 'error',
      message: status >= 500 ? 'サーバのエラーです' : err.message,
    });
  });
}

app.listen(9305, '127.0.0.1', () => {
  const mode = process.env.CUSTOM ? '自分のエラーハンドラ' : `既定のエラーハンドラ（NODE_ENV=${process.env.NODE_ENV ?? '未設定'}）`;
  console.log(`http://127.0.0.1:9305/ で待っています。${mode}（Ctrl+C で止める）`);
});
