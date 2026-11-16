// 第50章 練習問題8の模範解答: /fresh。とても短いキャッシュは、リクエストが来てから作るので <Suspense> に入れる
import { Suspense } from 'react';
import { getFreshCount } from '../../lib/count.ts';

async function FreshCount() {
  const count = await getFreshCount();
  return <p>タスクは {count} 件（2秒ごとに新しくなる）</p>;
}

export default function FreshPage() {
  return (
    <>
      <h1>新しい数</h1>
      <Suspense fallback={<p>数えています…</p>}>
        <FreshCount />
      </Suspense>
    </>
  );
}
