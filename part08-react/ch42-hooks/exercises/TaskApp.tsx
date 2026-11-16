// 第42章 練習問題7: useReducer で、タスクと絞り込みをまとめて扱う（本文8節）
import type { ReactNode } from 'react';

export type Task = { id: number; title: string; done: boolean };
export type Filter = 'all' | 'active' | 'done';
export type State = { tasks: Task[]; filter: Filter };
export type Action =
  | { type: 'added'; title: string }
  | { type: 'toggled'; id: number }
  | { type: 'renamed'; id: number; title: string }
  | { type: 'deleted'; id: number }
  | { type: 'cleared-done' }
  | { type: 'filter-changed'; filter: Filter };

// 書き換えてください（最初の state）
export const initialState: State = { tasks: [{ id: 0, title: 'まだ書いていません', done: false }], filter: 'all' };

export function reducer(state: State, action: Action): State {
  throw new Error('まだ書いていません');
}

export function TaskApp(): ReactNode {
  throw new Error('まだ書いていません');
}
