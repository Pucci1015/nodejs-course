// 第47章 3・6・8節: /tasks/1 のような URL のページ。[id] の部分が params.id に入る
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { STATUS_LABELS, getTask } from '../../../lib/api.ts';

/** URL の id を確かめて読む。数字でない・無いタスクなら notFound()（not-found.tsx を出す） */
async function loadTask(params: Promise<{ id: string }>) {
  const { id } = await params;
  if (!/^[1-9][0-9]*$/.test(id)) notFound();
  const task = await getTask(Number(id));
  if (task === null) notFound();
  return task;
}

// ページごとに title を変える。同じ URL への fetch は、1回の描画の中では1回にまとめられる
export async function generateMetadata({ params }: PageProps<'/tasks/[id]'>): Promise<Metadata> {
  const task = await loadTask(params);
  return { title: task.title };
}

export default async function TaskPage({ params }: PageProps<'/tasks/[id]'>) {
  const task = await loadTask(params);
  return (
    <>
      <h1>{task.title}</h1>
      <dl>
        <dt>状態</dt>
        <dd>{STATUS_LABELS[task.status]}</dd>
        <dt>締め切り</dt>
        <dd>{task.dueDate ?? 'なし'}</dd>
      </dl>
      <p>
        <Link href="/tasks">一覧に戻る</Link>
      </p>
    </>
  );
}
