// 第62章 2・3節: PaaS で動かす形の小さなアプリ
// - 待つポートは環境変数 PORT（PaaS が決めて渡す）。無ければ 9827
// - 本番（NODE_ENV=production）では、プロキシを 1 段信じ、Cookie を __Host-sid・Secure にし、HSTS を付ける
// - 本番で SESSION_SECRET が無ければ、起動せずに終了コード 1（第60章 2.2節。6.3節で、起動しない新しい版を作るのに使う）
// - /version で、動いている版（APP_VERSION）を返す（6節の切り替えと、7節のデプロイの後の確かめで使う）
// 動かし方（章のフォルダで）: node samples/app.ts
//   本番のつもりで: NODE_ENV=production SESSION_SECRET=dev-only-session-secret-0123456789ab node samples/app.ts
import express from 'express';

const production = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT ?? 9827);
const host = process.env.HOST ?? '127.0.0.1';
// Render は、build したコミットを RENDER_GIT_COMMIT に入れて渡す（執筆時点。7節）
const version = process.env.APP_VERSION ?? process.env.RENDER_GIT_COMMIT ?? 'dev';

if (production && (process.env.SESSION_SECRET ?? '').length < 32) {
  console.error('設定の間違い: SESSION_SECRET がありません（32 文字以上）');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
if (production) app.set('trust proxy', 1); // 前にプロキシ（PaaS のロードバランサ）が 1 段ある

app.use((req, res, next) => {
  // HTTPS で来たときだけ HSTS を付ける（http の応答に付けても、ブラウザは無視する）
  if (production && req.secure) res.set('Strict-Transport-Security', 'max-age=300; includeSubDomains');
  next();
});

app.get('/healthz', (_req, res) => {
  res.set('Cache-Control', 'no-store').json({ status: 'ok' });
});

app.get('/version', (_req, res) => {
  res.set('Cache-Control', 'no-store').json({ version });
});

app.post('/login', (req, res) => {
  // 本物のログインは第10部。ここでは、本番の Cookie の形だけを見る
  const name = production ? '__Host-sid' : 'sid';
  res.cookie(name, 'dev-only-session-id', { httpOnly: true, secure: production, sameSite: 'lax', path: '/' });
  res.json({ secure: req.secure, protocol: req.protocol, ip: req.ip });
});

const server = app.listen(port, host, () => {
  console.log(`http://${host}:${port}/ で待っています（版: ${version}、本番: ${production}）`);
});

// デプロイのたびに、PaaS は古い版に SIGTERM を送る（第60章 5節、第61章 5節）
process.on('SIGTERM', () => {
  console.log(`版 ${version}: SIGTERM を受けたので、受け付けをやめて、処理中の頼みを終えてから止まります`);
  server.close(() => process.exit(0));
});
