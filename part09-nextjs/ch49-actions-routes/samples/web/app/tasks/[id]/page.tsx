// 第47章 6節・第49章 3.3・3.4節: /tasks/1 のような URL のページ。状態を変えるボタンと、消すフォームを足した
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusButtons } from '../../../components/StatusButtons.tsx';
import { getTask } from '../../../lib/api.ts';
import { deleteTaskAction } from '../actions.ts';

/** URL の id を確かめて読む。数字でない・無いタスクなら notFound()（not-found.tsx を出す） */
async function loadTask(params: Promise<{ id: string }>) {
  const { id } = await params;
  if (!/^[1-9][0-9]*$/.test(id)) notFound();
  const task = await getTask(Number(id));
  if (task === null) notFound();
  return task;
}

export async function generateMetadata({ params }: PageProps<'/tasks/[id]'>): Promise<Metadata> {
  const task = await loadTask(params);
  return { title: task.title };
}

export default async function TaskPage({ params, searchParams }: PageProps<'/tasks/[id]'>) {
  const task = await loadTask(params);
  const { conflict } = await searchParams;
  // bind: 1つ目の引数（this）は null。残りの引数が、前から順に決まった関数ができる
  const deleteThis = deleteTaskAction.bind(null, task.id, task.version);
  return (
    <>
      <h1>{task.title}</h1>
      {conflict !== undefined && <p role="alert">ほかの人が先に変えていたので、消しませんでした。最新の内容を出しています。</p>}
      <dl>
        <dt>締め切り</dt>
        <dd>{task.dueDate ?? 'なし'}</dd>
      </dl>
      <StatusButtons id={task.id} version={task.version} status={task.status} />
      {/* JavaScript が無くても動くフォーム。押すと、deleteThis がサーバで呼ばれる */}
      <form action={deleteThis}>
        <button type="submit">このタスクを消す</button>
      </form>
      <p>
        <Link href="/tasks">一覧に戻る</Link>
      </p>
    </>
  );
}
