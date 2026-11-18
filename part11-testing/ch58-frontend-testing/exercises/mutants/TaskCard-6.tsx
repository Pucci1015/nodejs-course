// ミュータント: 期限が無いとき「期限なし」と出さない（何も出さない）
export interface CardTask {
  id: number;
  title: string;
  done: boolean;
  /** 'YYYY-MM-DD' か null */
  dueDate: string | null;
}

interface Props {
  task: CardTask;
  /** 今日の日付 'YYYY-MM-DD'（テストで決められるように、外から受け取る） */
  today: string;
  onToggle: (id: number, done: boolean) => void;
  onDelete: (id: number) => void;
}

export function TaskCard({ task, today, onToggle, onDelete }: Props) {
  // 'YYYY-MM-DD' どうしは、文字列のまま大小を比べられる
  const overdue = !task.done && task.dueDate !== null && task.dueDate < today;
  return (
    <li>
      <label>
        <input type="checkbox" checked={task.done} onChange={(e) => onToggle(task.id, e.target.checked)} />
        {task.title}
      </label>
      <span>{task.dueDate === null ? '' : `期限: ${task.dueDate}`}</span>
      {overdue && <strong>期限切れ</strong>}
      <button type="button" aria-label={`「${task.title}」を消す`} onClick={() => onDelete(task.id)}>
        消す
      </button>
    </li>
  );
}
