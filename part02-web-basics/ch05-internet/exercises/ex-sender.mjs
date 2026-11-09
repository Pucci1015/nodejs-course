// 練習問題4 用: わざと「変な区切り」でデータを送るクライアント
// 使い方: node ex-sender.mjs [ポート]   既定: 7100
//
// 4つのメッセージ（1行ずつ）を、次のように区切りを崩して送る:
//   - 1つの write に2つのメッセージを入れる
//   - 1つのメッセージを、途中で2つの write に分ける（間を 200ms あける）
//   - 日本語の1文字（UTF-8 で3バイト）を、バイトの途中で分ける
// 正しく作ったサーバなら、次の4行をこの順番で1行ずつ受け取れるはず:
//   1: apple
//   2: banana
//   3: こんにちは
//   4: 最後のメッセージ
import net from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

const port = Number(process.argv[2] ?? 7100);
const socket = net.connect(port, '127.0.0.1');

socket.on('connect', async () => {
  const bytes = Buffer.from('こんにちは\n'); // 「こ」は 3 バイト
  socket.write('apple\nban');            // 1つ目と、2つ目の途中まで
  await sleep(200);
  socket.write('ana\n');                 // 2つ目の残り
  await sleep(200);
  socket.write(bytes.subarray(0, 4));    // 「こ」の3バイト + 「ん」の1バイト目だけ
  await sleep(200);
  socket.write(Buffer.concat([bytes.subarray(4), Buffer.from('最後のメッセージ\n')]));
  socket.end();
});

socket.on('data', (chunk) => process.stdout.write(`サーバから: ${chunk}`));
socket.on('error', (err) => {
  console.error(`接続できません（${err.code}）。先にサーバを起動してください`);
  process.exitCode = 1;
});
