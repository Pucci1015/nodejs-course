// ミュータント: 足すのに失敗しても（422 など）、フォームに理由が届かない（例外を握りつぶす）
// 第58章: タスクの一覧を API から読み、足す・完了にする・消す（TanStack Query。第8部 第43章）
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTask, deleteTask, fetchTasks, updateTask } from '../api.ts';
import { AddTaskForm } from '../AddTaskForm.tsx';
import { TaskItem } from '../TaskItem.tsx';

export const tasksKey = ['tasks'] as const;

export function TaskListPanel() {
  const queryClient = useQueryClient();
  const tasks = useQuery({ queryKey: tasksKey, queryFn: ({ signal }) => fetchTasks(signal) });
  // 書き換えたら、一覧を読み直す
  const refresh = () => queryClient.invalidateQueries({ queryKey: tasksKey });
  const create = useMutation({ mutationFn: createTask, onSuccess: refresh });
  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) => updateTask(id, done),
    onSettled: refresh,
  });
  const remove = useMutation({ mutationFn: deleteTask, onSettled: refresh });
  const changeError = toggle.error ?? remove.error;

  return (
    <section>
      <AddTaskForm
        onAdd={async (title) => {
          await create.mutateAsync(title).catch(() => undefined);
        }}
      />
      {changeError && <p role="alert">変更できませんでした: {changeError.message}</p>}
      {tasks.isPending ? (
        <p role="status">読み込み中…</p>
      ) : tasks.isError ? (
        <div role="alert">
          <p>一覧を読み込めませんでした</p>
          <button type="button" onClick={() => void tasks.refetch()}>
            もう一度
          </button>
        </div>
      ) : tasks.data.length === 0 ? (
        <p>タスクはまだありません</p>
      ) : (
        <>
          <p>
            {tasks.data.length} 件中 {tasks.data.filter((t) => t.done).length} 件完了
          </p>
          <ul aria-label="タスク">
            {tasks.data.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={(id, done) => toggle.mutate({ id, done })}
                onDelete={(id) => remove.mutate(id)}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
