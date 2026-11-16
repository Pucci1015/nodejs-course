// 第46章 練習問題5の模範解答
import { renderToString } from 'react-dom/server';
import { NotFoundPage, TaskListPage, TaskPage, type Task } from '../exercises/pages.tsx';

export function render(pathname: string, tasks: Task[]): { status: number; html: string } {
  if (pathname === '/') return { status: 200, html: renderToString(<TaskListPage tasks={tasks} />) };
  const m = /^\/tasks\/([1-9][0-9]{0,8})$/.exec(pathname);
  const task = m ? tasks.find((t) => t.id === Number(m[1])) : undefined;
  if (task) return { status: 200, html: renderToString(<TaskPage task={task} />) };
  // 見つからないページは、中身も、ステータスも「見つからない」にする（ソフト 404 にしない）
  return { status: 404, html: renderToString(<NotFoundPage />) };
}
