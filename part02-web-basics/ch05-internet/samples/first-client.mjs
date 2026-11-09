// 最初の TCP クライアント（第5章 4.2節で書くものの完成形）
// 使い方: node first-client.mjs [ポート] [ホスト]   既定: 7001 127.0.0.1
//   例: node first-client.mjs 7001             （first-server.mjs を起動しておく）
//       node first-client.mjs 7002             （だれも待ち受けていない → ECONNREFUSED）
//       node first-client.mjs 80 192.0.2.1     （どこにも届かない → 時間切れ）
import net from 'node:net';

const port = Number(process.argv[2] ?? 7001);
const host = process.argv[3] ?? '127.0.0.1';

const socket = net.connect(port, host);
socket.setTimeout(3000); // 3秒、何も起きなければ 'timeout' イベント

socket.on('connect', () => console.log('接続できました'));
socket.on('data', (chunk) => console.log(`受信: ${chunk.toString()}`));
socket.on('end', () => console.log('相手が接続を終えました'));
socket.on('error', (err) => console.log(`エラー: ${err.code}`));
socket.on('timeout', () => {
  console.log('時間切れ: 3秒待っても返事がありません');
  socket.destroy(); // 接続をあきらめる
});
