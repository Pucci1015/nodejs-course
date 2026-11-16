// 第48章 5・6節: /tasks。searchParams を待つ部分を <Suspense> の中に入れ、見出しと検索の欄を先に送る
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { RefreshButton } from '../../components/RefreshButton.tsx';
import { SearchBox } from '../../components/SearchBox.tsx';
import { STATUS_LABELS, isStatus, listTasks } from '../../lib/api.ts';

export const metadata: Metadata = { title: 'タスクの一覧' };

type Query = Awaited<PageProps<'/tasks'>['searchParams']>;

async function TaskList({ query }: { query: Promise<Query> }) {
  const { status, q } = await query;
  const { items } = await listTasks({ status: isStatus(status) ? status : undefined });
  // 題名で探すのは API に無いので、サーバで絞り込む（ブラウザには、絞り込んだ後のものだけが届く）
  const word = typeof q === 'string' ? q.toLowerCase() : '';
  const shown = items.filter((t) => t.title.toLowerCase().includes(word));
  if (shown.length === 0) return <p>タスクはありません</p>;
  return (
    <ul>
      {shown.map((t) => (
        <li key={t.id}>
          <Link href={`/tasks/${t.id}`}>{t.title}</Link>（{STATUS_LABELS[t.status]}）
        </li>
      ))}
    </ul>
  );
}

export default function TasksPage({ searchParams }: PageProps<'/tasks'>) {
  // ここでは await しない。Promise のまま、<Suspense> の中の部品に渡す
  return (
    <>
      <h1>タスクの一覧</h1>
      {/* useSearchParams を使う Client Component も、<Suspense> の中に置く */}
      <Suspense fallback={<p>検索の欄を用意しています…</p>}>
        <SearchBox />
      </Suspense>
      <RefreshButton />
      <Suspense fallback={<p>読み込んでいます…</p>}>
        <TaskList query={searchParams} />
      </Suspense>
    </>
  );
}
