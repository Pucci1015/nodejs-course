// 第47章 2・3・8節: ルートのレイアウト。どのページも、この中の {children} の場所に入る。<html> と <body> はここにだけ書く
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  // ページが title を決めなければ「タスク管理」。決めたら「（ページの title） | タスク管理」
  title: { default: 'タスク管理', template: '%s | タスク管理' },
  description: '第47章のサンプル',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header>
          <nav aria-label="メニュー">
            <Link href="/">ホーム</Link>
            <Link href="/tasks">タスク</Link>
            <Link href="/about">このアプリについて</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
