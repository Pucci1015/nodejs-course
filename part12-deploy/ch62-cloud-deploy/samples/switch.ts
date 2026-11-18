// 第62章 6節: 2つの版を切り替えるプロキシ（ブルーグリーンデプロイの小さな形）
// - http://127.0.0.1:9820 で受けて、今の行き先（最初は 9821）へ渡す
// - 別のターミナルから `curl -X POST http://127.0.0.1:9820/__switch/9822` で、行き先を 9822 に替える
//   （練習用なので、だれでも切り替えられる。本物は合言葉で守る。練習問題8）
// 動かし方（章のフォルダで）: node samples/switch.ts
import http from 'node:http';

let active = 9821;

const server = http.createServer((req, res) => {
  const m = /^\/__switch\/(\d+)$/.exec(req.url ?? '');
  if (req.method === 'POST' && m) {
    active = Number(m[1]);
    console.log(`行き先を ${active} に替えました`);
    res.end(`行き先: ${active}\n`);
    return;
  }
  // 頼みが来た時の行き先に渡す。切り替えの途中の頼みも、最後まで同じ行き先で終わる
  const upstream = http.request(
    { host: '127.0.0.1', port: active, method: req.method, path: req.url, headers: req.headers },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on('error', () => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' }).end('アプリにつながりません\n');
  });
  req.pipe(upstream);
});

server.listen(9820, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:9820/ で受けて、今は ${active} へ渡します`);
});
