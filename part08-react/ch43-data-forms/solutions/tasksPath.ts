// 第43章 練習問題3の模範解答
import type { Status } from '../exercises/schemas.ts';

export type ListOptions = { statuses?: Status[]; sort?: string; dueBefore?: string | null; limit?: number };

export function tasksPath({ statuses = [], sort = '-createdAt', dueBefore = null, limit = 20 }: ListOptions = {}): string {
  const q = new URLSearchParams();
  // 同じものを1つにして、todo・doing・done の順にそろえる（キャッシュのキーや URL が、選んだ順で変わらないように）
  const order: Status[] = ['todo', 'doing', 'done'];
  const list = order.filter((s) => statuses.includes(s));
  if (list.length > 0) q.set('status', list.join(','));
  if (sort !== '-createdAt') q.set('sort', sort);
  if (dueBefore !== null && dueBefore !== '') q.set('due_before', dueBefore);
  if (limit !== 20) q.set('limit', String(limit));
  const s = q.toString();
  return s === '' ? '/tasks' : `/tasks?${s}`;
}
