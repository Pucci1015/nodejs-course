// 1つのタスク（2.4節）。状態・直すフォーム・消すボタン
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeleteButton } from '../../../components/DeleteButton.tsx';
import { StatusSelect } from '../../../components/StatusSelect.tsx';
import { TaskForm } from '../../../components/TaskForm.tsx';
import { getTask } from '../../../lib/api.ts';
import { formatDateTime } from '../../../lib/dates.ts';
import { updateTaskAction } from '../actions.ts';

async function loadTask(params: Promise<{ id: string }>) {
  const { id } = await params;
  if (!/^[1-9][0-9]*$/.test(id)) notFound();
  const task = await getTask(Number(id));
  if (task === null) notFound();
  return task;
}

export async function generateMetadata({ params }: PageProps<'/tasks/[id]'>): Promise<Metadata> {
  return { title: (await loadTask(params)).title };
}

export default async function TaskPage({ params, searchParams }: PageProps<'/tasks/[id]'>) {
  const task = await loadTask(params);
  const { created } = await searchParams;
  const original = { title: task.title, dueDate: task.dueDate };
  return (
    <>
      <h1>{task.title}</h1>
      {created !== undefined && <p role="status">「{task.title}」を作りました</p>}
      <dl className="meta">
        <dt>作った日時</dt>
        <dd>{formatDateTime(task.createdAt)}</dd>
        <dt>変えた日時</dt>
        <dd>{formatDateTime(task.updatedAt)}</dd>
        {task.completedAt && (
          <>
            <dt>完了した日時</dt>
            <dd>{formatDateTime(task.completedAt)}</dd>
          </>
        )}
      </dl>
      <StatusSelect id={task.id} version={task.version} status={task.status} />
      {/* key: 新しい version が届いたら、フォームを作り直す（新しい中身と、新しい version で送る action に替わる） */}
      <TaskForm
        key={task.version}
        action={updateTaskAction.bind(null, task.id, task.version, original)}
        initial={{ title: task.title, dueDate: task.dueDate ?? '' }}
        submitLabel="保存"
        pendingLabel="保存しています…"
      />
      <DeleteButton id={task.id} version={task.version} title={task.title} />
      <p>
        <Link href="/">一覧に戻る</Link>
      </p>
    </>
  );
}
