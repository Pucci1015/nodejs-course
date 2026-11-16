// 第41章 練習問題5: − と + で数を変える（本文6節）
import type { ReactNode } from 'react';
type Props = { min?: number; max?: number; initial?: number; label: string };

export function Stepper({ min = 0, max = 10, initial = min, label }: Props): ReactNode {
  throw new Error('まだ書いていません');
}
