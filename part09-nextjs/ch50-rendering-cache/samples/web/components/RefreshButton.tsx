'use client';
// 第48章 6.3節: 今のページの Server Component を、サーバでもう一度作り直してもらう
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
      {pending ? '読み直しています…' : '最新にする'}
    </button>
  );
}
