// 1つの重いリクエストが、サーバ全体を止める（第13章 5節）
// 使い方: node blocking-demo.mjs
//   サーバ（127.0.0.1:9130）を別のプロセスで起動し、/slow の直後に /fast を送って、かかった時間を比べる。
//   サーバだけを動かす: node blocking-demo.mjs server  （ブラウザで /slow と /fast を開いて試せる）
import http from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 9130;

/** ms ミリ秒のあいだ CPU を使い続ける（重い計算の代わり） */
function busy(ms) {
  const end = performance.now() + ms;
  let n = 0;
  while (performance.now() < end) n++;
  return n;
}

if (process.argv[2] === 'server') {
  http
    .createServer((req, res) => {
      if (req.url === '/slow') {
        const n = busy(1000); // 1秒、イベントループを止める
        return res.end(`slow: ${n} 回計算した\n`);
      }
      if (req.url === '/slow-async') {
        // 待つだけ（I/O の待ち時間の代わり）。イベントループは止まらない
        return setTimeout(() => res.end('slow-async: 1秒待った\n'), 1000);
      }
      res.end('fast\n');
    })
    .listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
} else {
  const server = spawn(process.execPath, [import.meta.filename, 'server'], { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((resolve) => server.stdout.once('data', resolve)); // 起動のメッセージを待つ

  const base = `http://127.0.0.1:${PORT}`;
  const timed = async (path) => {
    const start = performance.now();
    await (await fetch(base + path)).text();
    return `${path.padEnd(11)} ${String(Math.round(performance.now() - start)).padStart(5)}ms`;
  };

  for (const slow of ['/slow-async', '/slow']) {
    console.log(`--- ${slow} を送り、50ms 後に /fast を送る`);
    const results = await Promise.all([timed(slow), sleep(50).then(() => timed('/fast'))]);
    console.log(results.join('\n'));
  }
  server.kill();
}
