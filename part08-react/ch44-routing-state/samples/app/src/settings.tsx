// 第44章 7節: Context で、アプリのどこからでも使う「表示の設定」を配る
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Settings = { dark: boolean; compact: boolean };
type SettingsValue = { settings: Settings; update: (patch: Partial<Settings>) => void };

// Provider の外で使われたときの値は null（useSettings で見つける）
const SettingsContext = createContext<SettingsValue | null>(null);

function load(): Settings {
  try {
    return { dark: false, compact: false, ...(JSON.parse(localStorage.getItem('settings') ?? '{}') as Partial<Settings>) };
  } catch {
    return { dark: false, compact: false };
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(load);

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));
  return <SettingsContext value={{ settings, update }}>{children}</SettingsContext>;
}

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext);
  if (value === null) throw new Error('useSettings は <SettingsProvider> の中で使ってください');
  return value;
}
