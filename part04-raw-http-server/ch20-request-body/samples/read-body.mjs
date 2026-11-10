// 第20章 2〜4節で書く、ボディを全部読んでから返すサーバの完成形
// 使い方（~/dev/part04/ch20-request-body で）: node samples/read-body.mjs
//   別のターミナルで: curl -d 'こんにちは' http://127.0.0.1:9206/
//                     curl -i -d "$(seq 1 500)" http://127.0.0.1:9206/   → 413（1〜500 の数を並べた、1000 バイトより大きいボディ）
import http from 'node:http';

const PORT = 9206;
const LIMIT = 1000; // 受け取るボディは 1000 バイトまで

function sendText(res, status, text, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.byteLength(text), ...headers });
  res.end(text);
}

const server = http.createServer(async (req, res) => {
  // 1. 読む前に、客が言ってきた大きさ（Content-Length）で断る
  if (Number(req.headers['content-length']) > LIMIT) {
    return sendText(res, 413, `ボディは ${LIMIT} バイトまでです\n`, { Connection: 'close' });
  }
  // 2. チャンクを Buffer のまま集めて、最後に1回だけ文字に戻す
  const chunks = [];
  for await (const chunk of req) {
    console.log(`チャンク: ${chunk.length} バイト`);
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);
  sendText(res, 200, `${body.length} バイト受け取りました: ${body.toString('utf8')}\n`);
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
