// 第46章 2節: サーバが読んで、画面に渡すデータの形
export type Task = { id: number; title: string; status: 'todo' | 'doing' | 'done'; dueDate: string | null };

export type Route = { name: 'list' } | { name: 'task'; id: number } | { name: 'not-found' };

export type PageData = {
  route: Route;
  tasks: Task[]; // list のとき
  task: Task | null; // task のとき（無ければ null）
  renderedAt: string; // サーバで作った日時（ISO 8601）
};

// URL のパスから、どのページかを決める（サーバでも、ブラウザでも同じ関数を使う）
export function matchRoute(pathname: string): Route {
  if (pathname === '/') return { name: 'list' };
  const m = /^\/tasks\/([1-9][0-9]{0,8})$/.exec(pathname);
  if (m) return { name: 'task', id: Number(m[1]) };
  return { name: 'not-found' };
}
