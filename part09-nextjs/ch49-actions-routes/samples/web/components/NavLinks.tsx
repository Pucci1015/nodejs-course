'use client';
// 第48章 6節: 今の URL（usePathname）はブラウザで分かるので、メニューを Client Component にする
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'ホーム' },
  { href: '/tasks', label: 'タスク' },
  { href: '/dashboard', label: 'まとめ' },
  { href: '/about', label: 'このアプリについて' },
];

/** 今の URL が分かる前（前もって作る HTML の中）に出す、印の無いメニュー */
export function NavLinksFallback() {
  return <NavLinksView pathname={null} />;
}

export function NavLinks() {
  const pathname = usePathname();
  return <NavLinksView pathname={pathname} />;
}

function NavLinksView({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="メニュー">
      {LINKS.map(({ href, label }) => {
        if (pathname === null) {
          return (
            <Link key={href} href={href}>
              {label}
            </Link>
          );
        }
        // / はぴったりのときだけ、ほかは「その下」も今のページとみなす（/tasks/1 なら「タスク」）
        const current = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} aria-current={current ? 'page' : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
