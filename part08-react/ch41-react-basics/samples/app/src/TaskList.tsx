// 第41章 4・5節: 一覧。配列は map で並べ、key に id を渡す
import { TaskItem } from './TaskItem.tsx';
import type { Task } from './types.ts';

type Props = {
  tasks: Task[];
  onToggle: (id: number) => void;
};

export function TaskList({ tasks, onToggle }: Props) {
  if (tasks.length === 0) return <p>タスクはありません</p>;
  return (
    <ul>
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onToggle={onToggle} />
      ))}
    </ul>
  );
}
