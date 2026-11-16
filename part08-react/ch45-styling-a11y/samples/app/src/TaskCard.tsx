// 第45章 2.2節: CSS Modules で見た目を付けたカード。5節: ボタン・見出し・チェックボックスの名前
import styles from './TaskCard.module.css';
import { STATUS_LABELS, type Task } from './types.ts';

type Props = { task: Task; onToggle: () => void; onDelete: () => void };

export function TaskCard({ task, onToggle, onDelete }: Props) {
  const done = task.status === 'done';
  // 条件で付けるクラスは、配列にして空でないものだけをつなぐ
  const className = [styles.card, done && styles.done].filter(Boolean).join(' ');
  return (
    <li className={className}>
      <input type="checkbox" checked={done} onChange={onToggle} aria-label={`「${task.title}」を完了にする`} />
      <h3 className={styles.title}>{task.title}</h3>
      <span className={styles.badge}>{STATUS_LABELS[task.status]}</span>
      {/* 見た目は × だけでも、名前（aria-label）で何のボタンかを伝える */}
      <button type="button" onClick={onDelete} aria-label={`「${task.title}」を削除`}>
        <span aria-hidden="true">×</span>
      </button>
    </li>
  );
}
