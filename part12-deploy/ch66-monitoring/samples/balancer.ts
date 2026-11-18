// 第66章 7節: 小さなロードバランサ。頼みを、台に順番に（ラウンドロビン）配る。1 秒ごとに /healthz を聞き、答えない台には配らない
// 動かし方（章のフォルダで）: node samples/balancer.ts   → http://127.0.0.1:9860/ （台は 9867 と 9868）
//   TARGETS=http://127.0.0.1:9867,http://127.0.0.1:9868 で台を変えられる
import http from 'node:http';

const PORT = 9860;
const targets = (process.env.TARGETS ?? 'http://127.0.0.1:9867,http://127.0.0.1:9868').split(',').map((t) => ({ url: new URL(t), up: true }));
let next = 0;

/** 次の台（元気なものだけ、順番に） */
function pick() {
  for (let i = 0; i < targets.length; i += 1) {
    const t = targets[(next + i) % targets.length];
    if (t?.up) {
      next = (next + i + 1) % targets.length;
      return t;
    }
  }
  return undefined;
}

// 元気かどうかを、1 秒ごとに聞く（アクティブなヘルスチェック）
setInterval(() => {
  for (const t of targets) {
    void fetch(new URL('/healthz', t.url), { signal: AbortSignal.timeout(500) })
      .then((r) => r.ok)
      .catch(() => false)
      .then((ok) => {
        if (ok !== t.up) console.log(`${t.url.host} は ${ok ? '戻りました' : '答えません。配るのをやめます'}`);
        t.up = ok;
      });
  }
}, 1000);

http
  .createServer((req, res) => {
    const t = pick();
    if (!t) {
      res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' }).end('503 配れる台がありません\n');
      return;
    }
    const headers = { ...req.headers, 'x-forwarded-for': req.socket.remoteAddress ?? '' };
    const up = http.request({ host: t.url.hostname, port: t.url.port, method: req.method, path: req.url, headers }, (r) => {
      res.writeHead(r.statusCode ?? 502, r.headers);
      r.pipe(res);
    });
    up.on('error', () => {
      t.up = false; // 次のヘルスチェックまで、この台には配らない（パッシブなヘルスチェック）
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('502 台につながりません\n');
    });
    req.pipe(up);
  })
  .listen(PORT, '127.0.0.1', () => console.log(`ロードバランサ: http://127.0.0.1:${PORT}/ → ${targets.map((t) => t.url.host).join(', ')}`));
