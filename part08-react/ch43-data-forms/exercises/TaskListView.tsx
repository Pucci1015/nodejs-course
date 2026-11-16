// 第43章 練習問題2: 読み込みの状態（ユニオン）ごとに出し分ける（本文2.2節）
import type { ReactNode } from 'react';
import type { Task } from './schemas.ts';

export type Load = { status: 'pending' } | { status: 'error'; error: Error } | { status: 'success'; tasks: Task[] };

export function TaskListView({ load, onRetry }: { load: Load; onRetry: () => void }): ReactNode {
  throw new Error('まだ書いていません');
}
