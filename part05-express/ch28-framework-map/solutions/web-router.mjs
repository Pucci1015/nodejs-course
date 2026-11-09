// 練習問題5の模範解答: Web 標準の Request・Response で動く、小さなルーター（Hono や Next.js の Route Handlers の考え方）

/**
 * router.get('/tasks/:id', (request, ctx) => Response) のように登録し、router.fetch(request) で動かす
 */
export function createRouter() {
  const routes = []; // { method, pattern, handler }
  const middlewares = [];

  async function fetch(request) {
    const url = new URL(request.url);
    try {
      // 追加: ミドルウェアは Koa と同じ「玉ねぎ」の形。await next() で後ろを全部待てる（第4部 第18章の compose）
      let i = -1;
      const dispatch = async (n) => {
        if (n <= i) throw new Error('next() を2回呼びました');
        i = n;
        if (n < middlewares.length) return middlewares[n](request, () => dispatch(n + 1));
        return route(request, url);
      };
      return await dispatch(0);
    } catch {
      return new Response('Internal Server Error', { status: 500 }); // 中の文は見せない
    }
  }

  async function route(request, url) {
    const allowed = new Set();
    for (const r of routes) {
      const m = r.pattern.exec(url);
      if (!m) continue;
      allowed.add(r.method);
      if (r.method === 'GET') allowed.add('HEAD');
      // 修正: HEAD は GET のハンドラで答え、本文だけを捨てる
      const method = request.method === 'HEAD' ? 'GET' : request.method;
      if (r.method !== method) continue;
      // 修正: パスのパラメータは %xx を戻して渡す（URLPattern はそのまま渡す）
      const params = {};
      for (const [k, v] of Object.entries(m.pathname.groups)) {
        try {
          params[k] = decodeURIComponent(v);
        } catch {
          return new Response('Bad Request', { status: 400 });
        }
      }
      const response = await r.handler(request, { params, url });
      if (!(response instanceof Response)) throw new TypeError('ハンドラは Response を返してください');
      return request.method === 'HEAD' ? new Response(null, { status: response.status, headers: response.headers }) : response;
    }
    // 修正: パスはあるがメソッドが違うなら 405 と Allow。パスも無ければ 404
    if (allowed.size > 0) return new Response('Method Not Allowed', { status: 405, headers: { Allow: [...allowed].join(', ') } });
    return new Response('Not Found', { status: 404 });
  }

  const add = (method) => (path, handler) => {
    routes.push({ method, pattern: new URLPattern({ pathname: path }), handler });
    return router;
  };
  const router = {
    get: add('GET'),
    post: add('POST'),
    put: add('PUT'),
    patch: add('PATCH'),
    delete: add('DELETE'),
    use(mw) {
      middlewares.push(mw);
      return router;
    },
    fetch,
  };
  return router;
}
