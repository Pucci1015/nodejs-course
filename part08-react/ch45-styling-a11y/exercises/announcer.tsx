// 第45章 練習問題5: どこからでも、スクリーンリーダーに知らせられるようにする（本文7節）
import type { ReactNode } from 'react';

export function AnnouncerProvider({ children, clearAfterMs = 5000 }: { children: ReactNode; clearAfterMs?: number }): ReactNode {
  throw new Error('まだ書いていません');
}

export function useAnnounce(): (message: string) => void {
  throw new Error('まだ書いていません');
}
