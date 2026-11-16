// 第46章 2節: サーバでも、ブラウザでも描く部品。props の data だけから描く（どちらでも同じ結果になるように）
import { useEffect, useState } from 'react';
import type { PageData, Task } from './data.ts';

// ハイドレーションが終わったかを出す（サーバの HTML では、いつも「まだ」）
function HydrationBadge() {
  const [hydrated, setHydrated] = useState(false);
  // Effect はブラウザでしか動かない。動いたら、ハイドレーションが終わっている
  // eslint-disable-next-line react-hooks/set-state-in-effect -- ここでは「Effect が動いた」こと自体を見せたい
  useEffect(() => setHydrated(true), []);
  return <p className="badge">JavaScript: {hydrated ? '動いています（ハイドレーション済み）' : 'まだ動いていません'}</p>;
}

function TaskList({ tasks }: { tasks: Task[] }) {
  const [q, setQ] = useState('');
  const shown = tasks.filter((t) => t.title.includes(q));
  return (
    <section>
      <h1>タスク（{tasks.length} 件）</h1>
      {/* 絞り込みは、ハイドレーションが終わってから動く */}
      <input aria-label="絞り込み" value={q} onChange={(e) => setQ(e.target.value)} placeholder="題名で絞り込み" />
      <ul>
        {shown.map((t) => (
          <li key={t.id}>
            <a href={`/tasks/${t.id}`}>{t.title}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TaskDetail({ task }: { task: Task }) {
  return (
    <article>
      <h1>{task.title}</h1>
      <p>状態: {task.status}</p>
      <p>締め切り: {task.dueDate ?? 'なし'}</p>
    </article>
  );
}

function NotFound() {
  return <h1>ページが見つかりません</h1>;
}

export function App({ data }: { data: PageData }) {
  const { route } = data;
  return (
    <>
      <header>
        <a href="/">一覧</a> | <a href="/stream">集計（ストリーミング）</a>
        <HydrationBadge />
      </header>
      <main>
        {route.name === 'list' && <TaskList tasks={data.tasks} />}
        {route.name === 'task' && (data.task ? <TaskDetail task={data.task} /> : <NotFound />)}
        {route.name === 'not-found' && <NotFound />}
        <p>
          <small>サーバで作った日時: {data.renderedAt}</small>
        </p>
      </main>
    </>
  );
}

// ページの題名（<title>）
export function titleOf(data: PageData): string {
  if (data.route.name === 'list') return 'タスク';
  if (data.route.name === 'task' && data.task) return `${data.task.title} - タスク`;
  return 'ページが見つかりません';
}
