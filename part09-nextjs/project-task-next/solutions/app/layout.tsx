// どのページにも出す枠（2.5節）。「本文へ」・メニュー・<main>・SSE で作り直す部品
import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { LiveRefresh } from '../components/LiveRefresh.tsx';
import { NavLinks, NavLinksFallback } from '../components/NavLinks.tsx';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'タスク管理', template: '%s | タスク管理' },
  description: 'タスク管理アプリ（第9部の成果物）',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <a href="#main" className="skip-link">
          本文へ
        </a>
        <header className="site-header">
          <Suspense fallback={<NavLinksFallback />}>
            <NavLinks />
          </Suspense>
        </header>
        <main id="main">{children}</main>
        <LiveRefresh url="/api/events" />
      </body>
    </html>
  );
}
