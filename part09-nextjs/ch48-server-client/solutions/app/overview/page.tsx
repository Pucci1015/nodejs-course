// 第48章 練習問題5の模範解答: /overview。2つの部分を、別々の <Suspense> に入れて流す
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { listTasks } from '../../lib/api.ts';

export const metadata: Metadata = { title: '概要' };

async function Doing() {
  const { items } = await listTasks({ status: 'doing' });
  return (
    <ul>
      {items.map((t) => (
        <li key={t.id}>{t.title}</li>
      ))}
    </ul>
  );
}

async function TodoCount() {
  const { items } = await listTasks({ status: 'todo' });
  return <p>未着手: {items.length} 件</p>;
}

export default function OverviewPage() {
  return (
    <>
      <h1>概要</h1>
      <h2>作業中</h2>
      <Suspense fallback={<p>作業中のタスクを読んでいます…</p>}>
        <Doing />
      </Suspense>
      <h2>未着手</h2>
      <Suspense fallback={<p>未着手を数えています…</p>}>
        <TodoCount />
      </Suspense>
    </>
  );
}
