'use client';
// 第48章 練習問題6の模範解答: 状態を選ぶと URL の ?status= を変える部品
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const OPTIONS = [
  ['', 'すべて'],
  ['todo', '未着手'],
  ['doing', '作業中'],
  ['done', '完了'],
] as const;

export function StatusFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function choose(status: string) {
    const params = new URLSearchParams(searchParams); // ?q= などは残す
    if (status === '') params.delete('status');
    else params.set('status', status);
    const query = params.toString();
    router.replace(query === '' ? pathname : `${pathname}?${query}`);
  }

  return (
    <label>
      状態{' '}
      <select value={searchParams.get('status') ?? ''} onChange={(e) => choose(e.target.value)}>
        {OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
