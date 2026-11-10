// 第27章 4節で書く、ws-echo.mjs を試すクライアントの完成形（Node.js に組み込みの WebSocket を使う）
// 使い方（~/dev/part05/ch27-realtime で）: node samples/ws-client.mjs こんにちは
//   Origin を変えて試す: ORIGIN=http://other.localhost node samples/ws-client.mjs こんにちは
const origin = process.env.ORIGIN ?? 'http://127.0.0.1:9347';
const text = process.argv[2] ?? 'こんにちは';

// ブラウザはページのオリジンを Origin に入れる。ここでは、それを手で付ける
const ws = new WebSocket('ws://127.0.0.1:9347/ws', { headers: { Origin: origin } });

ws.addEventListener('open', () => {
  console.log('つながりました');
  ws.send(JSON.stringify({ text }));
  ws.send('{こわれた JSON'); // わざと間違ったものも送る
});
ws.addEventListener('message', (e) => console.log('届いた:', e.data));
ws.addEventListener('error', () => console.log('つなげませんでした'));
ws.addEventListener('close', () => console.log('閉じました'));

setTimeout(() => ws.close(), 500); // 少し待ってから閉じる
