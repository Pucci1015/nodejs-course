// 練習問題7 の模範解答: 1つのポートが open / closed / timeout のどれかを調べる
// 使い方: node check-port.mjs ポート [ホスト]   ホストの既定: 127.0.0.1
import net from 'node:net';

const port = Number(process.argv[2]);
const host = process.argv[3] ?? '127.0.0.1';

const socket = net.connect(port, host);
socket.setTimeout(2000);

socket.on('connect', () => {
  console.log(`${host}:${port} open（待ち受けている）`);
  socket.destroy(); // 調べるだけなので、すぐ閉じる
});

socket.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.log(`${host}:${port} closed（拒否された）`);
  } else {
    console.log(`${host}:${port} エラー ${err.code}`);
  }
});

socket.on('timeout', () => {
  console.log(`${host}:${port} timeout（2秒待っても返事が無い）`);
  socket.destroy();
});
