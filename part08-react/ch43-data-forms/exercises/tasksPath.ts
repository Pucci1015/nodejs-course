// 第43章 練習問題3: 一覧の条件から、API のパスとクエリを作る（本文1.3節）
import type { Status } from './schemas.ts';

export type ListOptions = { statuses?: Status[]; sort?: string; dueBefore?: string | null; limit?: number };

export function tasksPath(options: ListOptions = {}): string {
  throw new Error('まだ書いていません');
}
