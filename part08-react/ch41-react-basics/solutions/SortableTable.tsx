// 第41章 練習問題8の模範解答: 見出しを押すと、その列で並べ替える表
import { useState } from 'react';
import type { Task } from './types.ts';

type Key = 'title' | 'dueDate';
type Sort = { key: Key; dir: 'asc' | 'desc' };

const COLUMNS: { key: Key; label: string }[] = [
  { key: 'title', label: '題名' },
  { key: 'dueDate', label: '締め切り' },
];

/** 小さい順で比べる。null は最後 */
function compare(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

export function sortTasks(tasks: Task[], sort: Sort): Task[] {
  // toSorted は、元の配列を変えずに、並べ替えた新しい配列を返す
  return tasks.toSorted((x, y) => {
    const r = compare(x[sort.key], y[sort.key]);
    if (r === 0) return x.id - y.id;
    // null は、大きい順でも最後
    if (x[sort.key] === null || y[sort.key] === null) return r;
    return sort.dir === 'asc' ? r : -r;
  });
}

export function SortableTable({ tasks }: { tasks: Task[] }) {
  const [sort, setSort] = useState<Sort>({ key: 'title', dir: 'asc' });
  const rows = sortTasks(tasks, sort);

  function clickHeader(key: Key) {
    setSort(sort.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  }

  return (
    <table>
      <thead>
        <tr>
          {COLUMNS.map((c) => (
            <th key={c.key} aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <button type="button" onClick={() => clickHeader(c.key)}>
                {c.label}
                {sort.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((t) => (
          <tr key={t.id}>
            <td>{t.title}</td>
            <td>{t.dueDate ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
