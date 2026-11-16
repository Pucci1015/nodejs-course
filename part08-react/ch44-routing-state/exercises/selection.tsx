// 第44章 練習問題8: Context と useReducer で、離れた部品の間で「選んだタスク」を共有する（本文7.3節）
import type { ReactNode } from 'react';

type Action = { type: 'toggled'; id: number } | { type: 'all-selected'; ids: number[] } | { type: 'cleared' };

export function selectionReducer(selected: number[], action: Action): number[] {
  throw new Error('まだ書いていません');
}

export function SelectionProvider({ children }: { children: ReactNode }): ReactNode {
  throw new Error('まだ書いていません');
}

export function useSelection(): {
  selected: number[];
  isSelected: (id: number) => boolean;
  toggle: (id: number) => void;
  selectAll: (ids: number[]) => void;
  clear: () => void;
} {
  throw new Error('まだ書いていません');
}

export function SelectableItem({ id, title }: { id: number; title: string }): ReactNode {
  throw new Error('まだ書いていません');
}

export function SelectionBar({ allIds }: { allIds: number[] }): ReactNode {
  throw new Error('まだ書いていません');
}
