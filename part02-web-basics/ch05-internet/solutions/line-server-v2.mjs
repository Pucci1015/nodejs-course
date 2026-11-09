// 練習問題10 の模範解答: 文字化けせず、最後の行も取りこぼさず、接続ごとに番号を数えるサーバ
// 使い方: node line-server-v2.mjs [ポート]   既定: 7100
//   別のターミナルで: node exercises/ex-sender.mjs   （どちらも ~/dev/ch05 で）
import net from 'node:net';
import { StringDecoder } from 'node:string_decoder';

const port = Number(process.argv[2] ?? 7100);
let clients = 0;

const server = net.createServer((socket) => {
  // 次の3つは接続ごとに作る（関数の中に置く）。外に置くと、同時に来た接続どうしで混ざる
  clients += 1;
  const name = `接続${clients}`;
  const decoder = new StringDecoder('utf8'); // 修正: 文字の途中で切れたバイトを持っておく
  let buffer = '';
  let count = 0;

  function printLine(line) {
    count += 1;
    console.log(`[${name}] ${count}: ${line}`);
    socket.write(`受け取りました: ${line}\n`);
  }

  socket.on('data', (chunk) => {
    buffer += decoder.write(chunk); // 修正: chunk.toString() の代わり
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      printLine(line);
    }
  });

  socket.on('end', () => {
    // 修正: 改行の無いまま終わった残りも、1行として扱う
    buffer += decoder.end();
    if (buffer !== '') {
      printLine(buffer);
    }
    socket.end();
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`${port}番で待ち受けています`);
});
