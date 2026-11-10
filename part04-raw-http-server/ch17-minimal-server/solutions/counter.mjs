// 練習問題2 の模範解答
import http from 'node:http';

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

export function createCounterHandler() {
  let count = 0; // ハンドラを作るたびに、別の数を持つ（クロージャ）

  return (req, res) => {
    if (req.url === '/count') {
      count++;
      sendJson(res, 200, { count });
    } else if (req.url === '/reset') {
      count = 0;
      sendJson(res, 200, { count, message: '0 に戻しました' });
    } else {
      sendJson(res, 404, { error: '見つかりません' });
    }
  };
}

if (import.meta.main) {
  http.createServer(createCounterHandler()).listen(9179, '127.0.0.1', () => console.log('http://127.0.0.1:9179/count で待っています（Ctrl+C で止める）'));
}
