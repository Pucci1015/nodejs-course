// 第43章 練習問題5の模範解答
import { useEffect, useState } from 'react';
import { request } from '../exercises/api.ts';
import { TaskSchema, type Task } from '../exercises/schemas.ts';

export type TaskLoad = { status: 'idle' } | { status: 'pending' } | { status: 'error'; error: Error } | { status: 'success'; task: Task };

export function useTask(id: number | null): TaskLoad {
  // 結果と一緒に「どの id の結果か」を覚えておく（本文2.3節）
  const [result, setResult] = useState<{ id: number; load: TaskLoad } | null>(null);

  useEffect(() => {
    if (id === null) return;
    const controller = new AbortController();
    request(`/tasks/${id}`, { signal: controller.signal })
      .then((body) => TaskSchema.parse(body))
      .then(
        (task) => setResult({ id, load: { status: 'success', task } }),
        (error: unknown) => {
          if (controller.signal.aborted) return;
          setResult({ id, load: { status: 'error', error: error instanceof Error ? error : new Error(String(error)) } });
        },
      );
    return () => controller.abort();
  }, [id]);

  if (id === null) return { status: 'idle' };
  return result?.id === id ? result.load : { status: 'pending' };
}
