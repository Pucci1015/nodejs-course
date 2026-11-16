'use client';
// ほかのタブや人が変えたら、API の知らせ（SSE）を受けて、ページを作り直してもらう（第48章 練習問題8・第49章 5節）
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
