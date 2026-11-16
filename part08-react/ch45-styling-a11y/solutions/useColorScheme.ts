// 第45章 練習問題7の模範解答
import { useEffect, useState } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';
const QUERY = '(prefers-color-scheme: dark)';

export function useColorScheme(choice: ThemeChoice): 'light' | 'dark' {
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(QUERY).matches);

  // OS の設定が変わったら知らせてもらう
  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const scheme = choice === 'system' ? (systemDark ? 'dark' : 'light') : choice;

  // <html data-theme="…"> に反映する
  useEffect(() => {
    document.documentElement.dataset.theme = scheme;
  }, [scheme]);

  return scheme;
}
