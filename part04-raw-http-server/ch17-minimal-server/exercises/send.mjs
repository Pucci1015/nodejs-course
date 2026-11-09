// 練習問題4: 返事を返す小さな道具
// 仕様は README の練習問題4を見てください。
// 確かめる: node --test send.test.mjs

// sendText だけ書いてありますが、まちがいが2つあります
export function sendText(res, status, text, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain',
    'Content-Length': text.length,
    ...headers,
  });
  res.end(text);
}

export function sendHtml(res, status, html, headers) {
  // ここを書く
}

export function sendJson(res, status, value, headers) {
  // ここを書く
}

export function redirect(res, location, status = 302) {
  // ここを書く
}

export function noContent(res, headers) {
  // ここを書く
}
