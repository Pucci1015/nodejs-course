// 第43章 練習問題6の模範解答
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from '../exercises/api.ts';
import { PageSchema, TaskSchema, type Status, type TaskInput } from '../exercises/schemas.ts';

export const taskKeys = {
  all: ['tasks'] as const,
  list: (status: Status | 'all') => ['tasks', 'list', status] as const,
};

export function useTasks(status: Status | 'all') {
  return useQuery({
    queryKey: taskKeys.list(status),
    queryFn: async ({ signal }) => {
      const q = new URLSearchParams({ sort: 'dueDate', limit: '100' });
      if (status !== 'all') q.set('status', status);
      return PageSchema.parse(await request(`/tasks?${q}`, { signal })).items;
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskInput) =>
      TaskSchema.parse(await request('/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })),
    // invalidateQueries の Promise を返すと、読み直しが終わるまで isPending のまま（ボタンが早く戻りすぎない）
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
