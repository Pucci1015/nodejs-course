// 第50章 練習問題1の模範解答: /built。'use cache' と cacheLife('max') で、ビルドのときに1回だけ作る
import { cacheLife } from 'next/cache';

async function BuiltAt() {
  'use cache';
  cacheLife('max');
  return <p>ビルドした時刻: {new Date().toISOString()}</p>;
}

export default function BuiltPage() {
  return (
    <>
      <h1>ビルド</h1>
      <BuiltAt />
    </>
  );
}
