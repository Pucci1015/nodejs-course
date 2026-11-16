// 第50章 練習問題2の模範解答: /now。connection() の後は、リクエストが来てから作る
import { connection } from 'next/server';
import { Suspense } from 'react';

async function OpenedAt() {
  await connection();
  return <p>開いた時刻: {new Date().toISOString()}</p>;
}

export default function NowPage() {
  return (
    <>
      <h1>今</h1>
      <Suspense fallback={<p>開いた時刻: …</p>}>
        <OpenedAt />
      </Suspense>
    </>
  );
}
