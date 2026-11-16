// 第47章 2節: / のページ。app/page.tsx が「/」になる
import Link from 'next/link';

export default function HomePage() {
  // この console.log は、ブラウザではなく、next dev を動かしているターミナルに出る
  console.log('HomePage を描きました');
  return (
    <>
      <h1>タスク管理</h1>
      <p>第9部の練習用のアプリです。</p>
      <p>
        <Link href="/tasks">タスクの一覧へ</Link>
      </p>
    </>
  );
}
