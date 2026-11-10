// 練習問題7: Node.js の req・res と、Web 標準の Request・Response をつなぐ
// 要件は exercises/README.md の問題7です。確かめ方:
//   $ node --test web-adapter.test.mjs
// 今のひな形は、サンプルの web-handler-tasks.mjs の toNodeHandler と同じ、いちばん簡単なものです。
import { Readable } from 'node:stream';

export function toWebRequest(req, res) {
  const url = `http://${req.headers.host ?? 'localhost'}${req.url}`;
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  // ここを書く: 同じ名前のヘッダ、客が切ったときの signal
  return new Request(url, { method: req.method, headers: req.headers, body: hasBody ? Readable.toWeb(req) : undefined, duplex: 'half' });
}

export async function sendWebResponse(res, response, { method } = {}) {
  // ここを書く: Set-Cookie、ためずに送る、HEAD、客が切ったとき
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

export function toNodeHandler(handle) {
  return async (req, res) => {
    let response;
    try {
      response = await handle(toWebRequest(req, res));
    } catch {
      response = new Response('Internal Server Error', { status: 500 });
    }
    await sendWebResponse(res, response, { method: req.method });
  };
}
