'use client';
// 第48章 練習問題8の模範解答: API の知らせ（SSE）を受けたら、router.refresh() でページを読み直す
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const TYPES = ['task.created', 'task.updated', 'task.deleted'];

export function LiveRefresh({ url }: { url: string }) {
  const router = useRouter();
  useEffect(() => {
    const source = new EventSource(url);
    const onChange = () => router.refresh();
    for (const type of TYPES) source.addEventListener(type, onChange);
    return () => source.close(); // 後片付け（第42章）: 閉じると、もう知らせは来ない
  }, [url, router]);
  return null;
}
