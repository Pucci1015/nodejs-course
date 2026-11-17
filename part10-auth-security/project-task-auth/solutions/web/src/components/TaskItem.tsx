// 一覧の1行。完了のチェック・題名（詳しい画面へのリンク）・状態・締め切り
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { STATUS_LABELS, type Task } from '../api/schemas.ts';
import { dueInfo } from '../lib/dates.ts';
import styles from './TaskItem.module.css';

type Props = { task: Task; today: string; onToggle: (task: Task) => void };

export function TaskItem({ task, today, onToggle }: Props): ReactNode {
  const due = task.status === 'done' ? null : dueInfo(task.dueDate, today);
  return (
    <li className={task.status === 'done' ? `${styles.item} ${styles.done}` : styles.item}>
      <input type="checkbox" checked={task.status === 'done'} onChange={() => onToggle(task)} aria-label={`完了（${task.title}）`} />
      <Link to={`/tasks/${task.id}`} className={styles.title}>
        {task.title}
      </Link>
      <span className={styles.meta}>{STATUS_LABELS[task.status]}</span>
      {due && <span className={due.overdue ? `${styles.meta} ${styles.overdue}` : styles.meta}>{due.label}</span>}
    </li>
  );
}
