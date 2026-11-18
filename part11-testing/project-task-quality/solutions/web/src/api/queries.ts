// TanStack Query のフック（第43章 3〜7節）。一覧は「もっと読む」で続きを足す（useInfiniteQuery）
// 追加（第10部）: ログインしている人（useMe）とログアウト（useLogout）
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Filters } from '../filters.ts';
import { getMe, logout } from './auth.ts';
import { createTask, deleteTask, getTask, listTasks, updateTask } from './client.ts';
import type { Page, Task, TaskInput, TaskPatch } from './schemas.ts';

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => ['tasks', 'list'] as const,
  list: (f: Pick<Filters, 'statuses' | 'sort'>) => ['tasks', 'list', { statuses: f.statuses, sort: f.sort }] as const,
  detail: (id: number) => ['tasks', 'detail', id] as const,
};

/** 一覧。1ページ目を読み、fetchNextPage で nextCursor の続きを読む */
export function useTaskList(filters: Filters) {
  return useInfiniteQuery({
    queryKey: taskKeys.list(filters),
    queryFn: ({ pageParam, signal }) => listTasks(filters, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last: Page) => last.nextCursor, // null なら「もう無い」
  });
}

export function useTask(id: number) {
  return useQuery({ queryKey: taskKeys.detail(id), queryFn: ({ signal }) => getTask(id, signal) });
}

/** キャッシュにある一覧と詳しい画面の、そのタスクだけを置きかえる */
function replaceInCache(queryClient: QueryClient, task: Task) {
  queryClient.setQueriesData<InfiniteData<Page>>(
    { queryKey: taskKeys.lists() },
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((p) => ({ ...p, items: p.items.map((t) => (t.id === task.id ? task : t)) })),
      },
  );
  queryClient.setQueryData(taskKeys.detail(task.id), task);
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, key }: { input: TaskInput; key: string }) => createTask(input, key),
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(task.id), task);
      return queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/** 題名・締め切り・状態を変える。成功したら、返ってきたタスク（新しい version）でキャッシュを置きかえる */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ task, patch }: { task: Task; patch: TaskPatch }) => updateTask(task, patch),
    onSuccess: (task) => {
      replaceInCache(queryClient, task);
      // 状態や締め切りが変わると、並び順やどの一覧に入るかが変わるので、一覧は読み直す
      return queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/** 一覧のチェックボックス。応答を待たずに画面を変え（楽観的な更新）、失敗したら全部の一覧を戻す */
export function useToggleDone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (task: Task) => updateTask(task, { status: task.status === 'done' ? 'todo' : 'done' }),
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
      const previous = queryClient.getQueriesData<InfiniteData<Page>>({ queryKey: taskKeys.lists() });
      replaceInCache(queryClient, { ...task, status: task.status === 'done' ? 'todo' : 'done' });
      return { previous };
    },
    onError: (_error, task, context) => {
      for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data);
      queryClient.setQueryData(taskKeys.detail(task.id), task);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (task: Task) => deleteTask(task),
    onSuccess: (_data, task) => {
      queryClient.removeQueries({ queryKey: taskKeys.detail(task.id) });
      return queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

/** ほかのタブや人が変えたら、SSE で知らせてもらい、キャッシュを「古い」にする（第43章 7節） */
export function useTaskEvents() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const source = new EventSource('/api/events');
    const refresh = () => void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    for (const type of ['task.created', 'task.updated', 'task.deleted']) source.addEventListener(type, refresh);
    return () => source.close();
  }, [queryClient]);
}

/**
 * 追加（第10部）: ログインしている人。サーバが知っていること（サーバの状態）なので、Context ではなく TanStack Query に置く（第44章 6節）。
 * どの部品からでも useMe() で読め、ログイン・ログアウトしたら、このキャッシュを書き換えるだけで、全部の画面が変わる
 */
export const meKey = ['me'] as const;

export function useMe() {
  return useQuery({ queryKey: meKey, queryFn: ({ signal }) => getMe(signal), staleTime: 60_000 });
}

/** 追加（第10部）: ログアウト。前の人のタスクがキャッシュに残らないように消してから、「ログインしていない」にする */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: taskKeys.all });
      queryClient.setQueryData(meKey, null);
    },
  });
}
