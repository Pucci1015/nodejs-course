// 第42章 練習問題6の模範解答
import { useEffect, useState } from 'react';

function read<T>(key: string, initial: T): T {
  const text = localStorage.getItem(key);
  if (text === null) return initial;
  try {
    return JSON.parse(text) as T;
  } catch {
    return initial;
  }
}

export function useLocalStorage<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  // 関数を渡すと、最初の描画のときだけ呼ばれる（毎回 localStorage を読まない）
  const [value, setValue] = useState<T>(() => read(key, initial));

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  // useState の set 関数は、値も更新関数も受け取れるので、そのまま返せる
  return [value, setValue];
}
