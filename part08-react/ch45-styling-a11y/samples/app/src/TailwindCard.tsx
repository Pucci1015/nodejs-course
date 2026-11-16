// 第45章 4節: 同じカードを、Tailwind CSS のユーティリティのクラスで書いたもの
import { STATUS_LABELS, type Task } from './types.ts';

export function TailwindCard({ task }: { task: Task }) {
  const done = task.status === 'done';
  return (
    <li
      className={`mb-2 flex items-center gap-3 rounded-lg border border-gray-300 px-4 py-3 dark:border-gray-600 ${
        done ? 'bg-green-50 dark:bg-green-950' : ''
      }`}
    >
      <h3 className={`m-0 flex-1 text-base ${done ? 'line-through' : ''}`}>{task.title}</h3>
      {/* sm: は「画面の幅が 40rem 以上のときだけ」（狭い画面では状態の文字を出さない） */}
      <span className="hidden text-sm text-gray-600 sm:inline dark:text-gray-400">{STATUS_LABELS[task.status]}</span>
    </li>
  );
}
