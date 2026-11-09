// JSON のボディを受け取る（第20章 6節）
// 使い方: node json-demo.mjs
//   curl -i -H 'Content-Type: application/json' -d '{"name":"りょうた","n":1}' http://127.0.0.1:9202/api/echo
//   curl -i -H 'Content-Type: application/json' -d '{"name":' http://127.0.0.1:9202/api/echo       → 400
//   curl -i -d '{"name":"x"}' http://127.0.0.1:9202/api/echo                                       → 415（curl -d は urlencoded）
//   curl -i -H 'Content-Type: application/json' -d '{"id":9007199254740993,"a":1,"a":2}' http://127.0.0.1:9202/api/echo
import http from 'node:http';
import { createApp, HttpError } from '../../ch17-minimal-server/solutions/app.mjs';
import { sendJson } from '../../ch17-minimal-server/solutions/send.mjs';
import { readBodySimple } from './simple-body.mjs';

const PORT = 9202;

async function handler(req, res) {
  if (req.method !== 'POST' || new URL(`http://localhost${req.url}`).pathname !== '/api/echo') {
    throw new HttpError(404, 'ありません');
  }
  // Content-Type を確かめる。違えば 415 Unsupported Media Type
  const type = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') throw new HttpError(415, 'Content-Type: application/json で送ってください');

  const text = await readBodySimple(req);
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    console.log(`JSON.parse の失敗: ${err.message}`); // 理由はログに。客には短く
    throw new HttpError(400, 'JSON として読めません');
  }
  // 何が届いたかを、型も付けて返す
  const describe = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  const fields = data && typeof data === 'object' && !Array.isArray(data)
    ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, { value: v, type: describe(v) }]))
    : null;
  sendJson(res, 200, { received: text, top: describe(data), fields });
}

http.createServer(createApp(handler)).listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています`));
