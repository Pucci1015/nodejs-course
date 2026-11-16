// 第47章 練習問題6・8の模範解答
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { STATUS_LABELS, getTask } from '../../../lib/api.ts';

async function loadTask(params: Promise<{ id: string }>) {
  const { id } = await params;
  // 数字だけ（0 で始まらない）でなければ、API に聞くまでもなく「見つからない」
  if (!/^[1-9][0-9]*$/.test(id)) notFound();
  const task = await getTask(Number(id));
  if (task === null) notFound();
  return task;
}

// 問題8
export async function generateMetadata({ params }: PageProps<'/tasks/[id]'>): Promise<Metadata> {
  const task = await loadTask(params);
  return { title: task.title };
}

export default async function TaskPage({ params }: PageProps<'/tasks/[id]'>) {
  const task = await loadTask(params);
  return (
    <>
      <h1>{task.title}</h1>
      <p>状態: {STATUS_LABELS[task.status]}</p>
    </>
  );
}
