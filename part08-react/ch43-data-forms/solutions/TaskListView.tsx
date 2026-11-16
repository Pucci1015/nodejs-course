// 第43章 練習問題2の模範解答
import type { ReactNode } from 'react';
import type { Task } from '../exercises/schemas.ts';

export type Load = { status: 'pending' } | { status: 'error'; error: Error } | { status: 'success'; tasks: Task[] };

export function TaskListView({ load, onRetry }: { load: Load; onRetry: () => void }): ReactNode {
  // switch で status ごとに返す。どれかを書き忘れると、関数の最後まで来てしまうので tsc が知らせる
  switch (load.status) {
    case 'pending':
      return <p role="status">読み込み中…</p>;
    case 'error':
      return (
        <div role="alert">
          <p>読み込めませんでした: {load.error.message}</p>
          <button type="button" onClick={onRetry}>再試行</button>
        </div>
      );
    case 'success':
      if (load.tasks.length === 0) return <p>タスクはありません</p>;
      return (
        <ul>
          {load.tasks.map((t) => (
            <li key={t.id}>{t.title}</li>
          ))}
        </ul>
      );
  }
}
