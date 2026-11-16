'use client';
// メニュー（第48章 6.1節）。今のページのリンクに aria-current="page" を付ける
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: '一覧' },
  { href: '/tasks/new', label: '新しいタスク' },
] as const;

function NavLinksView({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="メニュー">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={pathname === l.href ? 'page' : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export function NavLinks() {
  return <NavLinksView pathname={usePathname()} />;
}

/** URL が分かるまで出しておく、印の無いメニュー */
export function NavLinksFallback() {
  return <NavLinksView pathname={null} />;
}
