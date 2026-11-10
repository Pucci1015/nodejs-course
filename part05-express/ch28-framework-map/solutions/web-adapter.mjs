// 練習問題7の模範解答: Node.js の req・res と、Web 標準の Request・Response をつなぐ
// @hono/node-server や、Next.js を Node.js で動かすときの中身も、大きくはこの形をしている
import { Readable } from 'node:stream';

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res  客が切ったことを知るために使う
 */
export function toWebRequest(req, res) {
  const protocol = req.socket.encrypted ? 'https' : 'http';
  const url = new URL(req.url ?? '/', `${protocol}://${req.headers.host ?? 'localhost'}`);
  // 追加: rawHeaders（[名前, 値, 名前, 値, …]）から作ると、同じ名前のヘッダも1つずつ入れられる
  const headers = new Headers();
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    const name = req.rawHeaders[i];
    if (/^:/.test(name)) continue; // HTTP/2 の :path などは入れない
    headers.append(name, req.rawHeaders[i + 1]);
  }
  // 追加: 客が先に切ったら signal で知らせる（ハンドラは fetch や DB の問い合わせをやめられる）
  const ac = new AbortController();
  res?.once('close', () => {
    if (!res.writableFinished) ac.abort();
  });
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined, // 修正: ためずに、流れのまま渡す
    duplex: 'half', // 流れのボディを渡すときに必要
    signal: ac.signal,
  });
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {Response} response
 * @param {{ method?: string }} [options]  HEAD なら本文を送らない
 */
export async function sendWebResponse(res, response, { method } = {}) {
  // 修正: Object.fromEntries(response.headers) だと、Set-Cookie が1つしか残らない
  const headers = {};
  for (const [name, value] of response.headers) {
    if (name === 'set-cookie') continue;
    headers[name] = value;
  }
  const cookies = response.headers.getSetCookie();
  if (cookies.length > 0) headers['set-cookie'] = cookies; // 配列にすると、1行ずつ送られる
  res.writeHead(response.status, response.statusText || undefined, headers);

  if (!response.body || method === 'HEAD') {
    await response.body?.cancel(); // 読まない本文は、捨てたと伝える
    res.end();
    return;
  }
  // 修正: arrayBuffer() で全部ためてから送らない。届いたものから送る（SSE や大きなファイル）
  const body = Readable.fromWeb(response.body);
  // 追加: 客が切ったら、読むのをやめる（ReadableStream の cancel が呼ばれる）
  res.once('close', () => {
    if (!res.writableFinished) body.destroy();
  });
  await new Promise((resolve) => {
    body.on('error', () => res.destroy()).on('close', resolve);
    body.pipe(res);
  });
}

/** handle(request) => Response を、node:http のハンドラにする */
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
