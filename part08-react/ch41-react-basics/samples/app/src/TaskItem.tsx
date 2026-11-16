// 第41章 3・5・6節: タスク1つ分。表示に要るものと、「押されたら呼ぶ関数」を props で受け取る
import type { Task } from './types.ts';

type Props = {
  task: Task;
  onToggle: (id: number) => void;
};

export function TaskItem({ task, onToggle }: Props) {
  return (
    <li className={task.status === 'done' ? 'done' : undefined}>
      <label>
        <input type="checkbox" checked={task.status === 'done'} onChange={() => onToggle(task.id)} />
        {task.title}
      </label>
      {task.dueDate !== null && <small>（締め切り: {task.dueDate}）</small>}
    </li>
  );
}
