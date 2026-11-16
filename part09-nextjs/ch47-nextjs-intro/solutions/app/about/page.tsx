// 第47章 練習問題2の模範解答
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'このアプリについて' };

export default function AboutPage() {
  return (
    <>
      <h1>このアプリについて</h1>
      <p>
        <Link href="/">ホームへ</Link>
      </p>
    </>
  );
}
