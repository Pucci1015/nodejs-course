// node:net で GET リクエストを送り、返ってきたレスポンスを「そのままのバイト」で表示する（第6章 8節）
// 使い方: node raw-client.mjs [パス] [ポート]   既定: / 8081
//   例: node raw-client.mjs /chunked      （http-echo-server.mjs を起動しておく）
import net from 'node:net';

const path = process.argv[2] ?? '/';
const port = Number(process.argv[3] ?? 8081);

const request = [
  `GET ${path} HTTP/1.1`,
  `Host: localhost:${port}`,
  'User-Agent: raw-client.mjs',
  'Connection: close', // 返し終わったら接続を閉じてもらう（＝ end で終わりが分かる）
  '',
  '',
].join('\r\n');

const socket = net.connect(port, '127.0.0.1', () => {
  process.stdout.write(`== 送ったバイト ==\n${request.replaceAll('\r\n', '\\r\\n\n')}\n== 受け取ったバイト ==\n`);
  socket.write(request);
});

const t0 = Date.now();
socket.on('data', (chunk) => {
  const shown = chunk.toString('utf8').replaceAll('\r\n', '\\r\\n\n');
  process.stdout.write(`--- ${Date.now() - t0} ms: ${chunk.length} バイト届いた ---\n${shown}\n`);
});
socket.on('end', () => console.log('== サーバが接続を閉じた =='));
socket.on('error', (err) => {
  console.error(`接続できません（${err.code}）。先にサーバを起動してください`);
  process.exitCode = 1;
});
