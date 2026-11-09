// 練習問題4 解答例: 返事を返す小さな道具
// どれも「ヘッダを先に全部決めて、end を1回だけ呼ぶ」形にそろえる
const NO_BODY = new Set([204, 304]);
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

function send(res, status, type, body, headers = {}) {
  if (NO_BODY.has(status)) {
    // 204 と 304 は本文を持てない。Content-Type も Content-Length も付けない
    res.writeHead(status, headers);
    res.end();
    return;
  }
  // 修正: 文字数ではなくバイト数（日本語は 1 文字 3 バイト）
  const buf = Buffer.from(body, 'utf8');
  res.writeHead(status, {
    'Content-Type': `${type}; charset=utf-8`, // 修正: 文字コードを書く
    'Content-Length': buf.length,
    ...headers,
  });
  // HEAD でも Content-Length は GET と同じ値にしておく。本文は Node が捨ててくれる
  res.end(res.req.method === 'HEAD' ? undefined : buf);
}

export function sendText(res, status, text, headers) {
  send(res, status, 'text/plain', String(text), headers);
}

export function sendHtml(res, status, html, headers) {
  send(res, status, 'text/html', String(html), headers);
}

export function sendJson(res, status, value, headers) {
  // 追加: undefined は JSON にできない（JSON.stringify が undefined を返す）
  const json = JSON.stringify(value);
  if (json === undefined) throw new TypeError('JSON にできない値です');
  send(res, status, 'application/json', json, headers);
}

export function redirect(res, location, status = 302) {
  if (!REDIRECTS.has(status)) throw new RangeError(`リダイレクトに使えないステータスです: ${status}`);
  // 本文はおまけ（Location を読まない古い道具のため）。HTML にはしない
  send(res, status, 'text/plain', `Redirecting to ${location}\n`, { Location: location });
}

export function noContent(res, headers) {
  send(res, 204, '', '', headers);
}
