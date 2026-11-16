// 第43章 3・4節: TanStack Query で読んだ一覧。完了の切り替え（楽観的な更新）と削除
import { useState } from 'react';
import { useDeleteTask, useTasks, useToggleDone } from './queries.ts';
import type { Status, Task } from './schemas.ts';
import { EditTitle } from './EditTitle.tsx';

const FILTERS: Record<Status | 'all', string> = { all: 'すべて', todo: '未着手', doing: '作業中', done: '完了' };

export function TaskList() {
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [editing, setEditing] = useState<Task | null>(null);
  const tasks = useTasks(filter);
  const toggle = useToggleDone(filter);
  const remove = useDeleteTask();

  return (
    <section>
      <h2>
        タスク {tasks.isFetching && <small>（更新中…）</small>}
      </h2>
      <div>
        {(Object.keys(FILTERS) as (Status | 'all')[]).map((f) => (
          <button key={f} type="button" aria-pressed={f === filter} onClick={() => setFilter(f)}>
            {FILTERS[f]}
          </button>
        ))}
      </div>
      {toggle.isError && <p role="alert">変えられませんでした: {toggle.error.message}</p>}
      {remove.isError && <p role="alert">消せませんでした: {remove.error.message}</p>}
      {tasks.isPending ? (
        <p>読み込み中…</p>
      ) : tasks.isError ? (
        <p role="alert">
          読み込めませんでした: {tasks.error.message}{' '}
          <button type="button" onClick={() => void tasks.refetch()}>再試行</button>
        </p>
      ) : tasks.data.length === 0 ? (
        <p>タスクはありません</p>
      ) : (
        <ul>
          {tasks.data.map((t) => (
            <li key={t.id}>
              <label>
                <input type="checkbox" checked={t.status === 'done'} onChange={() => toggle.mutate(t)} /> {t.title}
              </label>
              {t.dueDate && <small> 締め切り: {t.dueDate}</small>}{' '}
              <button type="button" onClick={() => setEditing(t)}>題名を変える</button>{' '}
              <button type="button" onClick={() => remove.mutate(t)}>削除</button>
            </li>
          ))}
        </ul>
      )}
      {/* key: 別のタスクを選んだら、編集欄を作り直す（第42章 4節） */}
      {editing && <EditTitle key={editing.id} task={editing} onDone={() => setEditing(null)} />}
    </section>
  );
}
