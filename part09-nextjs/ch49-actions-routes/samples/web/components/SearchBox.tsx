'use client';
// 第48章 6節: 検索の欄。打った文字を URL の ?q= に入れると、サーバのページが作り直される
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function search(q: string) {
    const params = new URLSearchParams(searchParams); // 今の ?status= などは残す
    if (q.trim() === '') params.delete('q');
    else params.set('q', q.trim());
    // サーバでページを作り直している間も、入力欄は打てる（トランジション。pending で「探しています」を出す）
    startTransition(() => router.replace(`${pathname}?${params}`));
  }

  return (
    <search>
      <label>
        題名で探す{' '}
        <input type="search" defaultValue={searchParams.get('q') ?? ''} onChange={(e) => search(e.target.value)} />
      </label>
      {pending && <span> 探しています…</span>}
    </search>
  );
}
