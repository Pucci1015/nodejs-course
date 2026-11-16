// 第43章 練習問題8の模範解答
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { request } from '../exercises/api.ts';
import { TaskSchema, type Task } from '../exercises/schemas.ts';

const flip = (t: Task): Task => ({ ...t, status: t.status === 'done' ? 'todo' : 'done' });

export function useToggleDone(listKey: readonly unknown[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: Task) =>
      TaskSchema.parse(
        await request(`/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'If-Match': `"${task.version}"` },
          body: JSON.stringify({ status: flip(task).status }),
        }),
      ),
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Task[]>(listKey);
      queryClient.setQueryData<Task[]>(listKey, (tasks) => tasks?.map((t) => (t.id === task.id ? flip(t) : t)));
      return { previous };
    },
    onError: (_error, _task, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(listKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
