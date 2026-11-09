// 同じタスク API を、フレームワークを使わずに「Web 標準のハンドラ」で（第28章 5節）
//   $ node web-handler-tasks.mjs      ← 127.0.0.1:9353
// handle(request) は Request を受け取って Response を返すだけの関数。
// Next.js の Route Handlers、Deno・Bun・Cloudflare Workers の fetch も、同じ形をしている
import http from 'node:http';
import { Readable } from 'node:stream';
import { createTaskService, isJson, NotFoundError, parseId, problem, ValidationError } from './tasks-core.mjs';

const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers });
const problemResponse = (status, url, detail) =>
  new Response(JSON.stringify(problem(status, { detail, instance: new URL(url).pathname })), { status, headers: { 'Content-Type': 'application/problem+json' } });

export function createHandler(service = createTaskService()) {
  // URLPattern は、Web 標準のパスの決まり（Node.js 24 からは、どこからでも使える）
  const one = new URLPattern({ pathname: '/tasks/:id' });

  return async function handle(request) {
    const { pathname } = new URL(request.url);
    try {
      if (pathname === '/tasks' && request.method === 'GET') return json({ items: service.list() });
      if (pathname === '/tasks' && request.method === 'POST') {
        if (!isJson(request.headers.get('content-type'))) return problemResponse(415, request.url);
        let body;
        try {
          body = await request.json();
        } catch {
          return problemResponse(400, request.url);
        }
        const task = service.create(body);
        return json(task, 201, { Location: `/tasks/${task.id}` });
      }
      const m = one.exec(request.url);
      if (m && request.method === 'GET') {
        const id = parseId(m.pathname.groups.id);
        if (id === null) throw new NotFoundError(`タスク ${m.pathname.groups.id} はありません`);
        return json(service.get(id));
      }
      return problemResponse(404, request.url);
    } catch (err) {
      if (err instanceof NotFoundError) return problemResponse(404, request.url, err.message);
      if (err instanceof ValidationError) return problemResponse(422, request.url, err.message);
      return problemResponse(500, request.url);
    }
  };
}

/**
 * Node.js の req・res と、Web 標準の Request・Response をつなぐ、いちばん簡単なもの。
 * 足りないところ（複数の Set-Cookie、客が切ったとき、HEAD など）は、練習問題2で直す
 */
export function toNodeHandler(handle) {
  return async (req, res) => {
    const url = `http://${req.headers.host ?? '127.0.0.1'}${req.url}`;
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const request = new Request(url, { method: req.method, headers: req.headers, body: hasBody ? Readable.toWeb(req) : undefined, duplex: 'half' });
    const response = await handle(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  };
}

export async function listen(port = 0) {
  const server = http.createServer(toNodeHandler(createHandler()));
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}

if (import.meta.main) {
  const { url } = await listen(9353);
  console.log(`Web 標準のハンドラ: ${url}/tasks（Ctrl+C で止める）`);
}
