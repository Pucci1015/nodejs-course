// 練習問題3: Express に足りない「405 と Allow」を足す
// Express は、パスはあるがメソッドが違うリクエストにも 404 を返します（本文 3.3 節）。
// 第18章の Router のように 405 と Allow を返す部品 resource を作ってください。
//   resource(app, '/api/tasks/:id', { get: 一覧, patch: 変更, delete: 削除 })
// 要件は exercises/README.md の問題3です。確かめ方:
//   $ node --test resource.test.mjs

// Allow に並べる順番（第18章と同じ）
export const ORDER = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

/**
 * @param {import('express').Express | import('express').Router} app
 * @param {string} path
 * @param {Partial<Record<'get'|'post'|'put'|'patch'|'delete', import('express').RequestHandler | import('express').RequestHandler[]>>} handlers
 */
export function resource(app, path, handlers) {
  const route = app.route(path);
  for (const [method, handler] of Object.entries(handlers)) {
    route[method](handler);
  }
  // ここを書く: 知らない名前の確かめ、OPTIONS、それ以外のメソッドへの 405
  return route;
}
