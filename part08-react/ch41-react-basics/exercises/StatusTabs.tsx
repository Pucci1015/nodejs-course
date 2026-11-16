// 第41章 練習問題3: 状態で絞り込むボタン（本文3・4・6節）
import type { ReactNode } from 'react';
import type { Status } from './types.ts';

export type Filter = 'all' | Status;

export function StatusTabs({ value, onChange }: { value: Filter; onChange: (next: Filter) => void }): ReactNode {
  throw new Error('まだ書いていません');
}
