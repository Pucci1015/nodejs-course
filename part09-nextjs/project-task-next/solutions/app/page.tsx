// 一覧（2.2節）。条件は URL にあり、サーバで API から読んで並べる
import Form from 'next/form';
import Link from 'next/link';
import { Suspense } from 'react';
import { DoneToggle } from '../components/DoneToggle.tsx';
import { listTasks } from '../lib/api.ts';
import { dueInfo, todayIn } from '../lib/dates.ts';
import { SORTS, cursorOf, parseFilters, toSearchParams, type Filters } from '../lib/filters.ts';
import { STATUSES, STATUS_LABELS, type Task } from '../lib/schemas.ts';

type Query = Awaited<PageProps<'/'>['searchParams']>;

/** 条件のフォーム。GET で送ると、URL の検索パラメータになる。next/form の Form は、ページ全体を読み直さずに移る */
function FilterForm({ filters }: { filters: Filters }) {
  return (
    <Form action="/" className="filters">
      <fieldset>
        <legend>状態</legend>
        {STATUSES.map((s) => (
          <label key={s}>
            <input type="checkbox" name="status" value={s} defaultChecked={filters.statuses.includes(s)} /> {STATUS_LABELS[s]}
          </label>
        ))}
      </fieldset>
      <label>
        並べ方{' '}
        <select name="sort" defaultValue={filters.sort}>
          {Object.entries(SORTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        題名で絞り込む <input type="search" name="q" defaultValue={filters.q} />
      </label>
      <button type="submit">絞り込む</button>
    </Form>
  );
}

function TaskItem({ task, today }: { task: Task; today: string }) {
  const due = task.status === 'done' ? null : dueInfo(task.dueDate, today);
  return (
    <li className={task.status === 'done' ? 'task-item done' : 'task-item'}>
      <DoneToggle id={task.id} version={task.version} title={task.title} done={task.status === 'done'} />
      <Link href={`/tasks/${task.id}`}>{task.title}</Link>
      {due && <span className={due.overdue ? 'due overdue' : 'due'}>{due.label}</span>}
    </li>
  );
}

async function TaskList({ query }: { query: Promise<Query> }) {
  const params = await query;
  const filters = parseFilters(params);
  const cursor = cursorOf(params);
  const { items, nextCursor } = await listTasks(filters, cursor);
  // 題名の絞り込みは API に無いので、読んだものの中から探す（大文字と小文字は区別しない）
  const q = filters.q.toLowerCase();
  const shown = items.filter((t) => t.title.toLowerCase().includes(q));
  const today = todayIn('Asia/Tokyo');
  const deleted = typeof params.deleted === 'string' ? params.deleted : null;
  return (
    <>
      {deleted !== null && <p role="status">「{deleted}」を消しました</p>}
      <FilterForm filters={filters} />
      {shown.length === 0 ? (
        <p>タスクはありません</p>
      ) : (
        <ul className="task-list">
          {shown.map((t) => (
            <TaskItem key={t.id} task={t} today={today} />
          ))}
        </ul>
      )}
      {nextCursor !== null && (
        <p>
          <Link href={`/?${toSearchParams(filters, nextCursor)}`}>次のページ</Link>
        </p>
      )}
    </>
  );
}

export default function TaskListPage({ searchParams }: PageProps<'/'>) {
  return (
    <>
      <h1>タスク一覧</h1>
      <Suspense fallback={<p>読み込んでいます…</p>}>
        <TaskList query={searchParams} />
      </Suspense>
    </>
  );
}
