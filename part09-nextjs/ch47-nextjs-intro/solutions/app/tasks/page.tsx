// 第47章 練習問題5・7の模範解答
import type { Metadata } from 'next';
import Link from 'next/link';
import { STATUSES, STATUS_LABELS, isStatus, listTasks } from '../../lib/api.ts';

export const metadata: Metadata = { title: 'タスクの一覧' };

export default async function TasksPage({ searchParams }: PageProps<'/tasks'>) {
  const { status } = await searchParams;
  const current = isStatus(status) ? status : undefined;
  const { items } = await listTasks({ status: current });

  return (
    <>
      <h1>タスクの一覧</h1>
      <nav aria-label="状態で絞り込む">
        <Link href="/tasks" aria-current={current === undefined ? 'page' : undefined}>
          全部
        </Link>
        {STATUSES.map((s) => (
          <span key={s}>
            {' | '}
            <Link href={`/tasks?status=${s}`} aria-current={current === s ? 'page' : undefined}>
              {STATUS_LABELS[s]}
            </Link>
          </span>
        ))}
      </nav>
      <ul>
        {items.map((t) => (
          <li key={t.id}>
            <Link href={`/tasks/${t.id}`}>{t.title}</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
