// 第46章 練習問題8の模範解答
import type { Writable } from 'node:stream';
import { Suspense, use, type ReactNode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';

export type Stats = { total: number; done: number };

function StatsView({ stats }: { stats: Promise<Stats> }): ReactNode {
  const s = use(stats);
  return (
    <p>
      全部で {s.total} 件、完了は {s.done} 件
    </p>
  );
}

function Page({ stats }: { stats: Promise<Stats> }): ReactNode {
  return (
    <main>
      <h1>集計</h1>
      <Suspense fallback={<p>集計中…</p>}>
        <StatsView stats={stats} />
      </Suspense>
    </main>
  );
}

export function streamStats(stats: Promise<Stats>, out: Writable): void {
  const { pipe } = renderToPipeableStream(<Page stats={stats} />, {
    onShellReady: () => pipe(out),
  });
}
