// 第43章 3〜7節: TanStack Query で、読み込み・書き込み・SSE をまとめたカスタムフック
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createTask, deleteTask, listTasks, updateTask } from './api.ts';
import type { Status, Task, TaskInput } from './schemas.ts';

// 3.2節: キャッシュの名前（キー）。['tasks'] で始まるものを、まとめて「古い」にできる
export const taskKeys = {
  all: ['tasks'] as const,
  list: (status: Status | 'all') => ['tasks', 'list', status] as const,
};

// 3節: 一覧を読む。queryFn に渡される signal で、要らなくなったリクエストを止める
export function useTasks(status: Status | 'all') {
  return useQuery({
    queryKey: taskKeys.list(status),
    queryFn: ({ signal }) => listTasks(status, signal),
  });
}

// 4.1節: 作る。成功したら一覧を「古い」にして、読み直させる
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => createTask(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

// 4.2節: 完了と未着手を切り替える。応答を待たずに画面を変え（楽観的な更新）、失敗したら戻す
export function useToggleDone(status: Status | 'all') {
  const queryClient = useQueryClient();
  const key = taskKeys.list(status);
  return useMutation({
    mutationFn: (task: Task) => updateTask(task, { status: task.status === 'done' ? 'todo' : 'done' }),
    onMutate: async (task) => {
      // 読み込みの途中なら止める（古い応答で、今から書く値を上書きされないように）
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key);
      queryClient.setQueryData<Task[]>(key, (tasks) =>
        tasks?.map((t) => (t.id === task.id ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t)),
      );
      return { previous }; // onError に渡る
    },
    onError: (_error, _task, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    // 成功しても失敗しても、最後に読み直して、サーバと合わせる
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

// 6節: 題名を変える。If-Match の version が古ければ 412（ApiError）
export function useRenameTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ task, title }: { task: Task; title: string }) => updateTask(task, { title }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (task: Task) => deleteTask(task),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

// 7節: ほかの人（ほかのタブ）が変えたら、SSE で知らせてもらい、一覧を読み直す
export function useTaskEvents() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const source = new EventSource('/api/events');
    const refresh = () => void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    for (const type of ['task.created', 'task.updated', 'task.deleted']) source.addEventListener(type, refresh);
    return () => source.close();
  }, [queryClient]);
}
