// 第46章 練習問題3の模範解答
export type Route =
  | { name: 'list' }
  | { name: 'new' }
  | { name: 'task'; id: number }
  | { name: 'redirect'; to: string }
  | { name: 'not-found' };

export function matchRoute(pathname: string): Route {
  // 最後の / は付けない形にそろえる（/tasks/3/ → /tasks/3）。同じページの URL を1つにする
  if (pathname.length > 1 && pathname.endsWith('/')) return { name: 'redirect', to: pathname.replace(/\/+$/, '') || '/' };
  if (pathname === '/') return { name: 'list' };
  if (pathname === '/tasks/new') return { name: 'new' };
  const m = /^\/tasks\/([1-9][0-9]{0,8})$/.exec(pathname);
  if (m) return { name: 'task', id: Number(m[1]) };
  return { name: 'not-found' };
}
