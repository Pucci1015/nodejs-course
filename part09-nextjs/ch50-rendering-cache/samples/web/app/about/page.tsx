// 第47章 3・8節: /about のページ。フォルダの名前が URL になる。title は layout の template に入る
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'このアプリについて' };

export default function AboutPage() {
  return (
    <>
      <h1>このアプリについて</h1>
      <p>Next.js の App Router で作りました。ページは、サーバで HTML になってから届きます。</p>
    </>
  );
}
