// 第50章 3節: /stats。'use cache' の関数の結果は、ビルドのときに読んで、前もって作る HTML に入る
import type { Metadata } from 'next';
import { STATUS_LABELS, STATUSES, getStats } from '../../lib/api.ts';

export const metadata: Metadata = { title: '数' };

export default async function StatsPage() {
  // 覚えておいた結果を使うので、<Suspense> が無くても、待たせない
  const stats = await getStats();
  return (
    <>
      <h1>タスクの数</h1>
      <p>全部で {stats.total} 件</p>
      <ul>
        {STATUSES.map((s) => (
          <li key={s}>
            {STATUS_LABELS[s]}: {stats[s]} 件
          </li>
        ))}
      </ul>
    </>
  );
}
