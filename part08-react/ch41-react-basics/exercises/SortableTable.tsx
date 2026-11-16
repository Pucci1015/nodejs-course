// 第41章 練習問題8: 見出しを押すと、その列で並べ替える表（本文4・6節）
import type { ReactNode } from 'react';
import type { Task } from './types.ts';

type Key = 'title' | 'dueDate';
type Sort = { key: Key; dir: 'asc' | 'desc' };

/** 並べ替えた新しい配列を返す（元の配列は変えない） */
export function sortTasks(tasks: Task[], sort: Sort): Task[] {
  throw new Error('まだ書いていません');
}

export function SortableTable({ tasks }: { tasks: Task[] }): ReactNode {
  throw new Error('まだ書いていません');
}
