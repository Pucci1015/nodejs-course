// 練習問題2 の模範解答
export function findRoute(routes, method, pathname) {
  const samePath = routes.filter((r) => r.path === pathname);
  if (samePath.length === 0) {
    return { status: 404 };
  }

  const route = samePath.find((r) => r.method === method);
  if (route) {
    return { status: 200, handler: route.handler };
  }

  // HEAD は、GET のルートで答える
  if (method === 'HEAD') {
    const get = samePath.find((r) => r.method === 'GET');
    if (get) return { status: 200, handler: get.handler };
  }

  // 使えるメソッドを、アルファベット順に並べる。GET があれば HEAD も使える。重ならないように Set を使う
  const methods = new Set(samePath.map((r) => r.method));
  if (methods.has('GET')) methods.add('HEAD');
  return { status: 405, allow: [...methods].sort().join(', ') };
}
