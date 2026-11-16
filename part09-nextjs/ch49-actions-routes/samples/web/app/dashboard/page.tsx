// 第48章 5節: /dashboard。遅さの違う2つの部分を、別々の <Suspense> に入れ、できたものから流す
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TaskCount } from '../../components/TaskCount.tsx';
import { STATUSES, STATUS_LABELS, listTasks } from '../../lib/api.ts';

export const metadata: Metadata = { title: 'まとめ' };

/** 状態ごとの数。3つの状態を、同時に（Promise.all で）API に聞く */
async function StatusCounts() {
  const pages = await Promise.all(STATUSES.map((status) => listTasks({ status })));
  return (
    <ul>
      {STATUSES.map((s, i) => (
        <li key={s}>
          {STATUS_LABELS[s]}: {pages[i]?.items.length ?? 0} 件
        </li>
      ))}
    </ul>
  );
}

/** 締め切りのあるタスク（わざと 1.5 秒遅らせる） */
async function WithDueDate() {
  await new Promise((r) => setTimeout(r, 1500));
  const { items } = await listTasks();
  const due = items.filter((t) => t.dueDate !== null);
  return (
    <ul>
      {due.map((t) => (
        <li key={t.id}>
          {t.title}（{t.dueDate}まで）
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  // await しない Promise を、Client Component に渡す（5.3節）
  const count = listTasks().then((p) => p.items.length);
  return (
    <>
      <h1>まとめ</h1>
      <Suspense fallback={<p>数えています…</p>}>
        <TaskCount count={count} />
      </Suspense>
      <h2>状態ごとの数</h2>
      <Suspense fallback={<p>状態ごとに数えています…</p>}>
        <StatusCounts />
      </Suspense>
      <h2>締め切りのあるタスク</h2>
      <Suspense fallback={<p>締め切りを調べています…</p>}>
        <WithDueDate />
      </Suspense>
    </>
  );
}
