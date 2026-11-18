// 一覧（/）。条件は URL、データは TanStack Query、題名の絞り込みは読み込んだものの中から
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useTaskList, useToggleDone } from '../api/queries.ts';
import { useAnnounce } from '../components/Announcer.tsx';
import { FilterBar } from '../components/FilterBar.tsx';
import { TaskItem } from '../components/TaskItem.tsx';
import { todayIn } from '../lib/dates.ts';
import { errorMessage } from '../lib/errors.ts';
import { useFilters } from '../useFilters.ts';
import { PageTitle } from '../components/PageTitle.tsx';

export function TaskListPage(): ReactNode {
  const [filters, setFilters] = useFilters();
  const list = useTaskList(filters);
  const toggle = useToggleDone();
  const announce = useAnnounce();
  // 題名の絞り込みは API に無いので、読み込んだものの中から探す（数十件なら、毎回の描画で計算して間に合う。第42章 6節）
  const q = filters.q.trim().toLowerCase();
  const today = todayIn('Asia/Tokyo');

  const tasks = (list.data?.pages ?? []).flatMap((p) => p.items).filter((t) => t.title.toLowerCase().includes(q));

  return (
    <>
      <PageTitle>タスク一覧</PageTitle>
      <p>
        <Link to="/tasks/new">新しいタスクを作る</Link>
      </p>
      <FilterBar filters={filters} onChange={setFilters} />

      {toggle.isError && (
        <p role="alert" className="error">
          {errorMessage(toggle.error)}
        </p>
      )}

      {list.isPending ? (
        <p>読み込んでいます…</p>
      ) : list.isError ? (
        <div role="alert">
          <p className="error">{errorMessage(list.error)}</p>
          <button type="button" onClick={() => void list.refetch()}>
            もう一度読む
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <p>タスクはありません</p>
      ) : (
        <ul className="task-list" aria-busy={list.isFetching}>
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              today={today}
              onToggle={(t) =>
                toggle.mutate(t, {
                  onSuccess: (updated) =>
                    announce(
                      `「${updated.title}」を${updated.status === 'done' ? '完了にしました' : '未着手に戻しました'}`,
                    ),
                })
              }
            />
          ))}
        </ul>
      )}

      {list.hasNextPage && (
        <button type="button" onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage}>
          {list.isFetchingNextPage ? '読み込んでいます…' : 'もっと読む'}
        </button>
      )}
    </>
  );
}
