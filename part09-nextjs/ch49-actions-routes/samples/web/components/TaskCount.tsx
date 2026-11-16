'use client';
// 第48章 5.3節: サーバから Promise を受け取り、use で待つ。待っている間は、外の <Suspense> の fallback が出る
import { use } from 'react';

export function TaskCount({ count }: { count: Promise<number> }) {
  const n = use(count);
  return <p>全部で {n} 件</p>;
}
