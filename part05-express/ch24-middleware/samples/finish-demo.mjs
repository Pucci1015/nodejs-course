// 応答が終わった後の処理: res の close と finish（第24章 4節）
//   $ node finish-demo.mjs
//   別のターミナルで:
//     curl -si http://127.0.0.1:9312/fast | grep -iE 'x-request-id|server-timing'
//     curl -s http://127.0.0.1:9312/slow
//     curl -s --max-time 0.3 http://127.0.0.1:9312/slow     ← 待たずに切る。ログは aborted
import express from 'express';
import { accessLog, requestId, serverTiming } from './my-middleware.mjs';

const app = express();

// まだ何も起きていない時点（前）で動き、応答が終わった時点（後）でも動かしたいものは、
// next() の後に書くのではなく、res のイベントを使う（ハンドラは非同期で、next() はすぐ戻ってくるため）
app.use(requestId());
app.use(accessLog());
app.use(serverTiming());

app.get('/fast', (req, res) => res.send('fast\n'));
app.get('/slow', async (req, res) => {
  await new Promise((r) => setTimeout(r, 1000));
  if (res.destroyed) return; // 客が先に切った。もう書いても届かない
  res.send('slow\n');
});

app.listen(9312, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9312/ で待っています（Ctrl+C で止める）');
});
