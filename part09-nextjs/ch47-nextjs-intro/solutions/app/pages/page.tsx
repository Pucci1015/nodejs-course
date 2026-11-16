// 第47章 練習問題8の模範解答: 3件ずつのページ送り
import Link from 'next/link';
import { listTasks } from '../../lib/api.ts';

export default async function PagesPage({ searchParams }: PageProps<'/pages'>) {
  const { cursor } = await searchParams;
  // ?cursor=a&cursor=b のように2回書かれると配列になるので、文字列のときだけ使う
  const { items, nextCursor } = await listTasks({ cursor: typeof cursor === 'string' ? cursor : undefined, limit: 3 });
  return (
    <>
      <h1>タスク（3件ずつ）</h1>
      <ul>
        {items.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
      {nextCursor !== null && <Link href={`/pages?cursor=${encodeURIComponent(nextCursor)}`}>次へ</Link>}
    </>
  );
}
