// 第43章 練習問題6: TanStack Query で、一覧を読むフックと、作るフック（本文3・4.1節）
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { Status, Task, TaskInput } from './schemas.ts';

// 書き換えてください
export const taskKeys = {
  all: ['まだ書いていません'] as readonly unknown[],
  list: (status: Status | 'all'): readonly unknown[] => ['まだ書いていません', status],
};

// 戻り値の型は、useQuery・useMutation が返すものの型（書いたら、消してもかまわない）
export function useTasks(status: Status | 'all'): UseQueryResult<Task[]> {
  throw new Error('まだ書いていません');
}

export function useCreateTask(): UseMutationResult<Task, Error, TaskInput> {
  throw new Error('まだ書いていません');
}
