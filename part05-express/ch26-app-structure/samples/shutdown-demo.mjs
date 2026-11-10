// ヘルスチェックと、きれいな止め方（graceful shutdown。第26章 7・8節）
//   $ node samples/shutdown-demo.mjs
//   別のターミナルで:
//     curl -s http://127.0.0.1:9333/healthz ; curl -s http://127.0.0.1:9333/readyz
//     curl -s http://127.0.0.1:9333/slow &  sleep 0.5 ; kill -TERM <起動したときに出た pid>
//   /slow は止める合図の後も最後まで返り、その後でプロセスが終わります（終了コード 0）
import express from 'express';

const SHUTDOWN_DELAY_MS = 1000; // 止める合図から、新しい接続を断るまでの待ち時間（ロードバランサが気づくまで）
const FORCE_EXIT_MS = 10_000; // それでも終わらないときに、あきらめて終わるまでの時間

let shuttingDown = false;
const app = express();
app.disable('x-powered-by');

// liveness: プロセスが動いていて、返事ができるか。ここが失敗したら、作り直してもらう
app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
// readiness: 新しいリクエストを受けてよいか。止める途中や、DB につながっていないときは 503
app.get('/readyz', (req, res) => {
  if (shuttingDown) return res.status(503).json({ status: 'shutting_down' });
  res.json({ status: 'ready' });
});
app.get('/slow', async (req, res) => {
  await new Promise((r) => setTimeout(r, 2000)); // 時間のかかる処理のつもり
  res.json({ done: true });
});

const server = app.listen(9333, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:9333/ で待っています（pid ${process.pid}。止めるには kill -TERM ${process.pid} か Ctrl+C）`);
});

function shutdown(signal) {
  if (shuttingDown) return; // 2回目の合図は無視（Ctrl+C を何回も押したとき）
  shuttingDown = true;
  console.log(`${signal} を受け取りました。/readyz を 503 にして、${SHUTDOWN_DELAY_MS}ms 待ちます`);

  // あきらめて終わるためのタイマー。unref() で「このタイマーのためにプロセスを残す」ことはしない
  setTimeout(() => {
    console.error('時間内に終わらなかったので、終了します');
    process.exit(1);
  }, FORCE_EXIT_MS).unref();

  setTimeout(() => {
    // 新しい接続を断り、今のリクエストが全部終わったらコールバックが呼ばれる。
    // 何もしていない keep-alive の接続は、Node 19 以降は close() が自分で切る
    server.close((err) => {
      console.log('すべてのリクエストが終わりました。終了します');
      // ここで DB の接続なども閉じる（第6部）
      process.exitCode = err ? 1 : 0; // process.exit() を呼ばず、やることが無くなって自然に終わるのを待つ
    });
  }, SHUTDOWN_DELAY_MS);
}

process.on('SIGTERM', () => shutdown('SIGTERM')); // kill、Docker の docker stop、PaaS の再起動
process.on('SIGINT', () => shutdown('SIGINT')); // Ctrl+C
