// 第44章 練習問題6: Context で配る「暗い色」の設定（本文7節）
import type { ReactNode } from 'react';

export type Theme = 'light' | 'dark';
type ThemeValue = { theme: Theme; toggle: () => void };

export function ThemeProvider({ initial = 'light', children }: { initial?: Theme; children: ReactNode }): ReactNode {
  throw new Error('まだ書いていません');
}

export function useTheme(): ThemeValue {
  throw new Error('まだ書いていません');
}

export function ThemeToggle(): ReactNode {
  throw new Error('まだ書いていません');
}
