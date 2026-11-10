// 練習問題6の模範解答: Express に「405 と Allow」を足す
export const ORDER = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const KNOWN = new Set(['get', 'post', 'put', 'patch', 'delete']); // 追加: 受け付ける名前

/**
 * @param {import('express').Express | import('express').Router} app
 * @param {string} path
 * @param {Partial<Record<'get'|'post'|'put'|'patch'|'delete', import('express').RequestHandler | import('express').RequestHandler[]>>} handlers
 */
export function resource(app, path, handlers) {
  const entries = Object.entries(handlers);
  // 追加: つづりの間違いは、リクエストが来てからではなく、登録の時点で見つける
  if (entries.length === 0) throw new TypeError('ハンドラが1つもありません');
  for (const [method, handler] of entries) {
    if (!KNOWN.has(method)) throw new TypeError(`知らないメソッドの名前です: ${method}`);
    const list = Array.isArray(handler) ? handler : [handler];
    if (list.length === 0 || !list.every((h) => typeof h === 'function')) {
      throw new TypeError(`${method} のハンドラが関数ではありません`);
    }
  }

  // 追加: Allow は、登録の時点で1回だけ作る
  const methods = new Set(entries.map(([m]) => m.toUpperCase()));
  if (methods.has('GET')) methods.add('HEAD');
  methods.add('OPTIONS');
  const allow = ORDER.filter((m) => methods.has(m)).join(', ');

  const route = app.route(path);
  for (const [method, handler] of entries) route[method](handler);

  // 追加: 上のどれにもあてはまらなかったリクエストは、ここに来る。
  //       route.all は、同じパスの「残り全部のメソッド」を受ける。HEAD は、GET があれば GET のハンドラが先に答える
  //       （Express の Route は、HEAD のハンドラが無ければ GET のハンドラを使う）
  route.all((req, res) => {
    res.set('Allow', allow);
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    res.status(405).json({ error: 'method_not_allowed', message: `${req.method} は使えません（使えるもの: ${allow}）` });
  });
  return route;
}
