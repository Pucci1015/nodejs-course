// 第48章: ルートのレイアウト。メニューは Client Component（NavLinks）にした。レイアウト自身は Server Component のまま
import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { NavLinks, NavLinksFallback } from '../components/NavLinks.tsx';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'タスク管理', template: '%s | タスク管理' },
  description: '第48章のサンプル',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header>
          {/* usePathname は、開かれた URL が分かるまで待つ。待つ間は、印の無いメニューを出しておく */}
          <Suspense fallback={<NavLinksFallback />}>
            <NavLinks />
          </Suspense>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
