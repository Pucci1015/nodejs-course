// 第43章 6節: 題名を変える。ほかの人が先に変えていたら（412）、知らせて読み直させる
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError } from './api.ts';
import { taskKeys, useRenameTask } from './queries.ts';
import type { Task } from './schemas.ts';

export function EditTitle({ task, onDone }: { task: Task; onDone: () => void }) {
  const [title, setTitle] = useState(task.title);
  const rename = useRenameTask();
  const queryClient = useQueryClient();
  const conflict = rename.error instanceof ApiError && rename.error.status === 412;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        rename.mutate({ task, title }, { onSuccess: onDone });
      }}
    >
      <h3>「{task.title}」の題名を変える（version {task.version}）</h3>
      <label>
        新しい題名 <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <button disabled={rename.isPending}>保存</button>{' '}
      <button type="button" onClick={onDone}>やめる</button>
      {conflict ? (
        <p role="alert">
          ほかの人が先に変えました。{' '}
          <button
            type="button"
            onClick={() => {
              // 一覧を読み直し、編集欄を閉じる。もう一度選ぶと、新しい version で編集できる
              void queryClient.invalidateQueries({ queryKey: taskKeys.all });
              onDone();
            }}
          >
            読み直す
          </button>
        </p>
      ) : (
        rename.isError && <p role="alert">{rename.error.message}</p>
      )}
    </form>
  );
}
