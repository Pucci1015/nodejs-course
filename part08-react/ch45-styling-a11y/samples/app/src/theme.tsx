// 第45章 3節: テーマ（system・light・dark）を Context で配り（第44章 7節）、<html data-theme> に反映する
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';
const ThemeContext = createContext<{ choice: ThemeChoice; setChoice: (c: ThemeChoice) => void } | null>(null);

function load(): ThemeChoice {
  const v = localStorage.getItem('theme');
  return v === 'light' || v === 'dark' ? v : 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>(load);

  // React の外（<html> の属性・localStorage）と合わせるので Effect（第42章 3節）
  useEffect(() => {
    const root = document.documentElement;
    if (choice === 'system') {
      delete root.dataset.theme; // 属性を消すと、CSS の prefers-color-scheme が効く
      localStorage.removeItem('theme');
    } else {
      root.dataset.theme = choice;
      localStorage.setItem('theme', choice);
    }
  }, [choice]);

  return <ThemeContext value={{ choice, setChoice }}>{children}</ThemeContext>;
}

export function useTheme() {
  const v = useContext(ThemeContext);
  if (v === null) throw new Error('useTheme は <ThemeProvider> の中で使ってください');
  return v;
}

const LABELS: Record<ThemeChoice, string> = { system: 'OS に合わせる', light: '明るい色', dark: '暗い色' };

// 6.1節: ラジオボタンのまとまりは、fieldset と legend で名前を付ける
export function ThemePicker() {
  const { choice, setChoice } = useTheme();
  return (
    <fieldset>
      <legend>テーマ</legend>
      {(Object.keys(LABELS) as ThemeChoice[]).map((c) => (
        <label key={c}>
          <input type="radio" name="theme" value={c} checked={choice === c} onChange={() => setChoice(c)} /> {LABELS[c]}
        </label>
      ))}
    </fieldset>
  );
}
