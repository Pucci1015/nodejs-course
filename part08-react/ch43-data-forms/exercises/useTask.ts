// 第43章 練習問題5: useEffect で、タスクを1つ読むフック。古い応答で上書きしない（本文2節）
import type { Task } from './schemas.ts';

export type TaskLoad = { status: 'idle' } | { status: 'pending' } | { status: 'error'; error: Error } | { status: 'success'; task: Task };

export function useTask(id: number | null): TaskLoad {
  throw new Error('まだ書いていません');
}
