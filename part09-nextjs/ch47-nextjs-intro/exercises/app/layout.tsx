// 第47章 練習問題のレイアウト（このファイルは変えません）
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: { default: '練習問題', template: '%s | 練習問題' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header>
          <Link href="/">練習問題のホーム</Link>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
