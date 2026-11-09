// 練習問題6 の模範解答: POST /sum で、ボディに書かれた数の合計を返すサーバ
// 使い方: node calc-server.mjs        別のターミナルで: curl -d '1 2 3' http://127.0.0.1:8088/sum
import http from 'node:http';

function send(res, status, text) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(text);
}

const server = http.createServer((req, res) => {
  if (req.url !== '/sum') {
    send(res, 404, '見つかりません\n');
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    send(res, 405, 'POST で、数をスペースで区切って送ってください\n');
    return;
  }

  req.setEncoding('utf8');
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    const words = body.trim().split(' ');
    let sum = 0;
    for (const word of words) {
      const n = Number(word);
      // 空のボディ（''）と、数にできない文字（'abc' → NaN）は、送った側の誤りなので 400
      if (word === '' || Number.isNaN(n)) {
        send(res, 400, `数ではありません: "${word}"\n`);
        return;
      }
      sum += n;
    }
    send(res, 200, `合計: ${sum}\n`);
  });
});

server.listen(8088, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8088/sum で待ち受けています');
});
