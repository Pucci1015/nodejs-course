// 無いページ・無いタスク（2.4節）
import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <h1>ページが見つかりません</h1>
      <p>
        <Link href="/">一覧に戻る</Link>
      </p>
    </>
  );
}
