'use client';
// 第48章 練習問題2の模範解答: 今のページなら aria-current="page" を付けるリンク
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  // / は、ちょうど / のときだけ。ほかは、同じか、その下の階層（/tasks なら /tasks/3 も）
  const current = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} aria-current={current ? 'page' : undefined}>
      {children}
    </Link>
  );
}
