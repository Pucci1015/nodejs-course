'use client';
// 第48章 練習問題8の模範解答と同じ。第49章 5節: API の知らせを受けたら、router.refresh() でページを作り直してもらう
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const TYPES = ['task.created', 'task.updated', 'task.deleted'];

export function LiveRefresh({ url }: { url: string }) {
  const router = useRouter();
  useEffect(() => {
    const source = new EventSource(url);
    const onChange = () => router.refresh();
    for (const type of TYPES) source.addEventListener(type, onChange);
    return () => source.close();
  }, [url, router]);
  return null;
}
