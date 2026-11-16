// 第45章 練習問題8: キーボードで動かせるタブ（本文9節）
import type { ReactNode } from 'react';

export type Tab = { label: string; content: ReactNode };

export function Tabs({ label, tabs }: { label: string; tabs: Tab[] }): ReactNode {
  throw new Error('まだ書いていません');
}
