// 第41章 練習問題1の模範解答: タスク1つ分の <li>
import type { Status, Task } from './types.ts';

const LABELS: Record<Status, string> = { todo: '未着手', doing: '作業中', done: '完了' };

export function TaskCard({ task }: { task: Task }) {
  return (
    <li className={task.status === 'done' ? 'task done' : 'task'} data-status={task.status}>
      <span className="title">{task.title}</span> <span className="badge">{LABELS[task.status]}</span>
      {task.dueDate !== null && <small> 締め切り: {task.dueDate}</small>}
    </li>
  );
}
