// 練習問題4 用: curl が普段は送らない「変わった、でも正しい」リクエストを送るクライアント
// 使い方: node tricky-client.mjs モード [ポート]   既定のポート: 8090
//   モード:
//     slow       POST /echo を、ヘッダの途中とボディの前の2か所で区切り、間を 300ms あけて送る
//     lowercase  POST /echo を、ヘッダ名をすべて小文字で送る（HTTP では大文字・小文字は区別しない）
// レスポンスのボディを（レスポンスの Content-Length の分だけ）表示する。
// 2秒以内にレスポンスが揃わなければ「時間切れ」と表示して終了ステータス 1。
import net from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

const mode = process.argv[2];
const port = Number(process.argv[3] ?? 8090);
const body = 'name=ねこ';
const length = Buffer.byteLength(body);

const requests = {
  slow: [
    'POST /echo HTTP/1.1\r\nHost: localhost\r\nContent-Ty',
    `pe: text/plain\r\nContent-Length: ${length}\r\nConnection: close\r\n\r\n`,
    body,
  ],
  // メソッドは大文字・小文字を区別する（GET と get は別物）ので、ヘッダ名だけを小文字にする
  lowercase: [`POST /echo HTTP/1.1\r\nhost: localhost\r\ncontent-length: ${length}\r\nconnection: close\r\n\r\n${body}`],
};

if (!requests[mode]) {
  console.error('使い方: node tricky-client.mjs slow|lowercase [ポート]');
  process.exit(2);
}

const received = [];
const socket = net.connect(port, '127.0.0.1', async () => {
  for (const [i, part] of requests[mode].entries()) {
    if (i > 0) await sleep(300);
    socket.write(part);
  }
});
socket.on('data', (chunk) => {
  received.push(chunk);
  // ヘッダが揃い、Content-Length の分だけボディが届いたら終わり
  const all = Buffer.concat(received);
  const headerEnd = all.indexOf('\r\n\r\n');
  if (headerEnd === -1) return;
  const match = all.subarray(0, headerEnd).toString('latin1').match(/^content-length:\s*(\d+)/im);
  const bodyLength = match ? Number(match[1]) : 0;
  if (all.length >= headerEnd + 4 + bodyLength) finish(false, all.subarray(headerEnd + 4, headerEnd + 4 + bodyLength));
});

const timer = setTimeout(() => {
  finish(true);
}, 2000);
socket.on('end', () => finish(true));
socket.on('error', (err) => {
  console.error(`接続できません（${err.code}）`);
  process.exit(1);
});

let finished = false;
function finish(incomplete, body = Buffer.alloc(0)) {
  if (finished) return;
  finished = true;
  clearTimeout(timer);
  socket.destroy();
  process.stdout.write(body.toString('utf8'));
  if (incomplete) {
    console.log('（レスポンスが揃う前に、時間切れか接続が閉じられました）');
    process.exitCode = 1;
  }
}
