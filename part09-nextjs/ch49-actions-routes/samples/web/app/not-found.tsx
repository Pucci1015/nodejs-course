// 第47章 6節: notFound() を呼んだとき・どの URL にも合わないときに出すもの
import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <h1>ページが見つかりません</h1>
      <p>
        <Link href="/">ホームに戻る</Link>
      </p>
    </>
  );
}
