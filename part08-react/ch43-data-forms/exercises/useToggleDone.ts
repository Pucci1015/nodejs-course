// 第43章 練習問題8: 完了と未着手を切り替える。応答を待たずに画面を変え、失敗したら戻す（本文4.2節）
import type { UseMutationResult } from '@tanstack/react-query';
import type { Task } from './schemas.ts';

// 戻り値の型は、useMutation が返すものの型（書いたら、消してもかまわない）
export function useToggleDone(listKey: readonly unknown[]): UseMutationResult<Task, Error, Task, unknown> {
  throw new Error('まだ書いていません');
}
