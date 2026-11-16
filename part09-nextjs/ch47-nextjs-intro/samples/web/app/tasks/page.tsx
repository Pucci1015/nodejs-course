// 第47章 5・7節: /tasks のページ。サーバで API を読み、HTML にして返す。?status=… で絞り込む
import type { Metadata } from 'next';
import Link from 'next/link';
import { STATUSES, STATUS_LABELS, isStatus, listTasks } from '../../lib/api.ts';

export const metadata: Metadata = { title: 'タスクの一覧' };

export default async function TasksPage({ searchParams }: PageProps<'/tasks'>) {
  // searchParams は Promise。await すると、?status=done なら { status: 'done' }
  const { status } = await searchParams;
  const current = isStatus(status) ? status : undefined; // 知らない値は「全部」と同じ
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
      {items.length === 0 ? (
        <p>タスクはありません</p>
      ) : (
        <ul>
          {items.map((t) => (
            <li key={t.id}>
              <Link href={`/tasks/${t.id}`}>{t.title}</Link>（{STATUS_LABELS[t.status]}）
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
