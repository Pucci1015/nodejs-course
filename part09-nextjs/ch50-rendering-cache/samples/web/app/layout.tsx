// 第48章: ルートのレイアウト。メニューは Client Component（NavLinks）にした。レイアウト自身は Server Component のまま
// 第49章 5節: API の知らせでページを作り直す LiveRefresh を足した
import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { LiveRefresh } from '../components/LiveRefresh.tsx';
import { NavLinks, NavLinksFallback } from '../components/NavLinks.tsx';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'タスク管理', template: '%s | タスク管理' },
  description: '第49章のサンプル',
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
        {/* 同じオリジンの Route Handler（app/api/events/route.ts）につなぐ */}
        <LiveRefresh url="/api/events" />
      </body>
    </html>
  );
}
