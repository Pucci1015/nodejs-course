// 第46章 練習問題6の模範解答
import { useSyncExternalStore, type ReactNode } from 'react';

const subscribe = () => () => {};

// サーバとハイドレーションの間は false、その後は true
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true, // ブラウザで（ハイドレーションの後）
    () => false, // サーバと、ハイドレーションの間
  );
}

export function formatUtc(iso: string): string {
  // '2026-11-11T16:10:38.925Z' → '2026-11-11 16:10 UTC'。どこで動かしても同じ文字になる
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

export function LocalTime({ iso }: { iso: string }): ReactNode {
  const hydrated = useHydrated();
  const text = hydrated ? new Date(iso).toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }) : formatUtc(iso);
  return <time dateTime={iso}>{text}</time>;
}
