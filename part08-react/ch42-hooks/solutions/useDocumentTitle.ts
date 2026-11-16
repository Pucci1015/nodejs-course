// 第42章 練習問題2の模範解答
import { useEffect } from 'react';

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    // 後片付け: 次の Effect の前と、画面から消えるときに、元に戻す
    return () => {
      document.title = prev;
    };
  }, [title]);
}
