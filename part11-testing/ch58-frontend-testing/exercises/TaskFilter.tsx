// 練習問題3: テストが探せる（役割と名前のある）フィルタの部品を書く
// 使い方: npx vitest run TaskFilter.test.tsx
//         MODULE=../solutions/TaskFilter.tsx npx vitest run TaskFilter.test.tsx   … 模範解答で試す
import type { ReactNode } from 'react';

export type Filter = 'all' | 'open' | 'done';

export interface FilterTask {
  id: number;
  title: string;
  done: boolean;
}

interface Props {
  tasks: FilterTask[];
  filter: Filter;
  onChange: (filter: Filter) => void;
}

export function TaskFilter({ tasks, filter, onChange }: Props): ReactNode {
  // ここを書く
  void tasks;
  void filter;
  void onChange;
  throw new Error('まだ書いていません');
}
