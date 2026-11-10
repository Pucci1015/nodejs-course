// 第20章 6節で書く、JSON を受け取って 415・400・422・201 を返し分けるサーバの完成形
// 使い方（~/dev/part04/ch20-request-body で）: node samples/json-server.mjs
//   別のターミナルで: curl -i -H 'Content-Type: application/json' -d '{"name":"alice"}' http://127.0.0.1:9206/api/users
import http from 'node:http';

const PORT = 9206;

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/api/users') {
    return sendJson(res, 404, { error: '見つかりません' });
  }
  const type = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') {
    return sendJson(res, 415, { error: 'JSON で送ってください' }); // 決めた種類でない
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);

  let data;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return sendJson(res, 400, { error: 'JSON として読めません' }); // 形として読めない
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return sendJson(res, 422, { error: 'オブジェクトで送ってください' });
  }
  if (typeof data.name !== 'string' || data.name.trim() === '') {
    return sendJson(res, 422, { error: 'name を書いてください' }); // 読めたが、中身が決まりに合わない
  }
  sendJson(res, 201, { name: data.name.trim() }); // 使うキーだけを取り出して返す
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/api/users で待っています（Ctrl+C で止める）`));
