// 1つのタスク（/tasks/:id）。状態を変える・題名と締め切りを直す・消す
// 追加（第12部）: 添付ファイル（画像）
import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ApiError } from '../api/client.ts';
import { useDeleteTask, useTask, useUpdateTask } from '../api/queries.ts';
import { STATUSES, STATUS_LABELS, type Status, type Task, type TaskPatch } from '../api/schemas.ts';
import { useAnnounce } from '../components/Announcer.tsx';
import { Attachments } from '../components/Attachments.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { TaskForm } from '../components/TaskForm.tsx';
import { formatDateTime } from '../lib/dates.ts';
import { errorMessage, isNotFound } from '../lib/errors.ts';
import { NotFoundPage } from './NotFoundPage.tsx';
import { PageTitle } from '../components/PageTitle.tsx';

export function TaskDetailPage(): ReactNode {
  // URL の :id は文字列。数字だけでなければ、無いページと同じ（第44章 3節）
  const { id = '' } = useParams();
  if (!/^[1-9][0-9]*$/.test(id)) return <NotFoundPage />;
  return <TaskDetail id={Number(id)} />;
}

const isStatus = (v: string): v is Status => (STATUSES as readonly string[]).includes(v);

function TaskDetail({ id }: { id: number }): ReactNode {
  const query = useTask(id);
  if (query.isPending) return <p>読み込んでいます…</p>;
  if (query.isError) {
    if (isNotFound(query.error)) return <NotFoundPage />;
    return (
      <div role="alert">
        <p className="error">{errorMessage(query.error)}</p>
        <button type="button" onClick={() => void query.refetch()}>
          もう一度読む
        </button>
      </div>
    );
  }
  // 読み直して version が変わったら、フォームを作り直す（中の state を新しい値で始める）
  return <TaskView key={query.data.version} task={query.data} reload={() => void query.refetch()} />;
}

function TaskView({ task, reload }: { task: Task; reload: () => void }): ReactNode {
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const navigate = useNavigate();
  const announce = useAnnounce();
  const [confirming, setConfirming] = useState(false);

  // 412 だけは「読み直す」を出す。ほかの失敗は文だけ。422 はフォームが項目の横に出すので、ここには出さない
  const error = update.error ?? remove.error;
  const failed = error instanceof ApiError && error.status === 422 ? null : error;
  const stale = failed instanceof ApiError && failed.status === 412;

  async function save(patch: TaskPatch) {
    const updated = await update.mutateAsync({ task, patch });
    announce(`「${updated.title}」を保存しました`);
  }

  return (
    <>
      <PageTitle>{task.title}</PageTitle>

      {failed && (
        <div role="alert">
          <p className="error">{errorMessage(failed)}</p>
          {stale && (
            <button type="button" onClick={reload}>
              読み直す
            </button>
          )}
        </div>
      )}

      <p>
        <label>
          状態{' '}
          <select
            value={task.status}
            disabled={update.isPending}
            onChange={(e) => {
              const status = e.target.value;
              if (isStatus(status)) save({ status }).catch(() => {}); // 失敗は update.error で出す
            }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </p>

      <dl className="meta">
        <dt>作った日時</dt>
        <dd>{formatDateTime(task.createdAt)}</dd>
        <dt>変えた日時</dt>
        <dd>{formatDateTime(task.updatedAt)}</dd>
        {task.completedAt !== null && (
          <>
            <dt>完了した日時</dt>
            <dd>{formatDateTime(task.completedAt)}</dd>
          </>
        )}
      </dl>

      <h2>直す</h2>
      <TaskForm
        initial={{ title: task.title, dueDate: task.dueDate ?? '' }}
        submitLabel="保存"
        onSubmit={async (input) => {
          // 変わった項目だけを送る（締め切りが過ぎたタスクの、題名だけを直せるように）
          const patch: TaskPatch = {};
          if (input.title !== task.title) patch.title = input.title;
          if (input.dueDate !== task.dueDate) patch.dueDate = input.dueDate;
          if (Object.keys(patch).length === 0) return;
          // 412・409 は、上の role="alert" に出す。422 だけはフォームに投げ返す
          await save(patch).catch((err: unknown) => {
            if (err instanceof ApiError && err.status === 422) throw err;
          });
        }}
      />

      <Attachments taskId={task.id} />

      <h2>消す</h2>
      <button type="button" className="danger" onClick={() => setConfirming(true)}>
        消す
      </button>
      <ConfirmDialog
        open={confirming}
        title={`「${task.title}」を消しますか`}
        confirmLabel="消す"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          remove.mutate(task, {
            onSuccess: () => {
              announce(`「${task.title}」を消しました`);
              void navigate('/');
            },
          });
        }}
      >
        <p>消したタスクは、元に戻せません。</p>
      </ConfirmDialog>
    </>
  );
}
