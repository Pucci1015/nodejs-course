// 第43章の queries.ts の読む部分。一覧のキーに、並べ方も入れた。1つ読む useTask を足した
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTask, getTask, listTasks } from './api.ts';
import type { Status, TaskInput } from './schemas.ts';

export const taskKeys = {
  all: ['tasks'] as const,
  list: (status: Status | 'all', sort: string) => ['tasks', 'list', { status, sort }] as const,
  detail: (id: number) => ['tasks', 'detail', id] as const,
};

export function useTasks(status: Status | 'all', sort: string) {
  return useQuery({
    queryKey: taskKeys.list(status, sort),
    queryFn: ({ signal }) => listTasks(status, sort, signal),
  });
}

export function useTask(id: number) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: ({ signal }) => getTask(id, signal),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => createTask(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
