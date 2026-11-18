// 画面の変化をスクリーンリーダーに知らせる（第45章 練習問題5と同じもの）
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const AnnounceContext = createContext<((message: string) => void) | null>(null);

export function AnnouncerProvider({
  children,
  clearAfterMs = 5000,
}: {
  children: ReactNode;
  clearAfterMs?: number;
}): ReactNode {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (message === '') return;
    const id = setTimeout(() => setMessage(''), clearAfterMs);
    return () => clearTimeout(id);
  }, [message, clearAfterMs]);

  return (
    <AnnounceContext value={setMessage}>
      {children}
      {/* 知らせる場所は、いつも置いておく（中の文だけを変える） */}
      <div role="status" aria-live="polite" className="visually-hidden">
        {message}
      </div>
    </AnnounceContext>
  );
}

export function useAnnounce(): (message: string) => void {
  const announce = useContext(AnnounceContext);
  if (announce === null) throw new Error('useAnnounce は <AnnouncerProvider> の中で使ってください');
  return announce;
}
