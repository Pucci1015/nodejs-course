// 練習問題8: Web 標準の Request・Response で動く、小さなルーター
// 要件は exercises/README.md の問題8です。確かめ方:
//   $ node --test web-router.test.mjs

export function createRouter() {
  const routes = [];

  async function fetch(request) {
    const url = new URL(request.url);
    for (const r of routes) {
      const m = r.pattern.exec(url);
      if (m && r.method === request.method) return r.handler(request, { params: m.pathname.groups, url });
    }
    // ここを書く: HEAD、405、%xx、ミドルウェア、例外
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
      return router; // ここを書く
    },
    fetch,
  };
  return router;
}
