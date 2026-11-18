// 第60章 4.1節: ときどき落ちるサーバ（/crash で、受け取られない例外を起こす）
// 動かし方（章のフォルダで）: node samples/crash.ts   別のターミナルで curl http://127.0.0.1:9807/crash
import http from 'node:http';

const startedAt = new Date().toISOString();
const server = http.createServer((req, res) => {
  if (req.url === '/crash') {
    res.end('落ちます\n');
    // コールバックの中の throw は、どこにも受け取られないので、プロセスが終わる（第3部 第12章）
    setTimeout(() => {
      throw new Error('思いがけないエラー');
    }, 10);
    return;
  }
  res.end(`動いています（pid ${process.pid}、起動 ${startedAt}）\n`);
});
server.listen(9807, '127.0.0.1', () => console.log(`pid ${process.pid}: http://127.0.0.1:9807/ で待っています`));
// Ctrl+C（SIGINT）は、ターミナルから見張り役と子の両方に届く。どちらで止めても、1回だけ止める
let stopping = false;
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    if (stopping) return;
    stopping = true;
    console.log(`pid ${process.pid}: ${sig} を受け取ったので止めます`);
    server.close(() => process.exit(0));
  });
}
