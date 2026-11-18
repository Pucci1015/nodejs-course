// 練習問題で使う、本文の samples/app/src/TaskItem.tsx のコピー（書き換えなくてよい）
// 第58章: タスク1つの行。チェックボックスで完了を切り替え、ボタンで消す
import type { Task } from './api.ts';

interface Props {
  task: Task;
  onToggle: (id: number, done: boolean) => void;
  onDelete: (id: number) => void;
}

export function TaskItem({ task, onToggle, onDelete }: Props) {
  return (
    <li className={task.done ? 'task done' : 'task'}>
      {/* label の中に入れると、チェックボックスの「名前」が題名になる */}
      <label>
        <input type="checkbox" checked={task.done} onChange={(e) => onToggle(task.id, e.target.checked)} />
        {task.title}
      </label>
      {task.done && <span className="badge">完了</span>}
      {/* 「消す」が並ぶので、どのタスクのボタンかを名前に入れる */}
      <button type="button" aria-label={`「${task.title}」を消す`} onClick={() => onDelete(task.id)}>
        消す
      </button>
    </li>
  );
}
