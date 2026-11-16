// 第44章 練習問題6の模範解答
import { createContext, useContext, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';
type ThemeValue = { theme: Theme; toggle: () => void };

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ initial = 'light', children }: { initial?: Theme; children: ReactNode }): ReactNode {
  const [theme, setTheme] = useState<Theme>(initial);
  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  return <ThemeContext value={{ theme, toggle }}>{children}</ThemeContext>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (value === null) throw new Error('useTheme は <ThemeProvider> の中で使ってください');
  return value;
}

export function ThemeToggle(): ReactNode {
  const { theme, toggle } = useTheme();
  return (
    <button type="button" aria-pressed={theme === 'dark'} onClick={toggle}>
      暗い色
    </button>
  );
}
