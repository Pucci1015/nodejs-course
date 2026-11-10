// 第13章 5.1節で書く、1つの重いリクエストが全員を待たせるサーバの完成形
// 使い方（~/dev/part03/ch13-event-loop で）: node samples/block-server.mjs → 別のターミナルで curl
import http from 'node:http';

// ms ミリ秒、CPU を使い続ける（重い計算の代わり）
function busy(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // 何もしないで回り続ける
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/slow') {
    busy(3000); // 3秒「計算する」
    res.end('slow: 3秒計算した\n');
    return;
  }
  if (req.url === '/wait') {
    setTimeout(() => res.end('wait: 3秒待った\n'), 3000); // 3秒「待つ」だけ
    return;
  }
  res.end('fast\n');
});

server.listen(9133, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9133/ で待っています（Ctrl+C で止める）');
});
