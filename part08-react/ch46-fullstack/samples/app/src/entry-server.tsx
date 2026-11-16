// 第46章 2・6節: サーバの入り口。データから HTML の文字を作る
import { Suspense, use, type ReactNode } from 'react';
import { renderToPipeableStream, renderToString } from 'react-dom/server';
import { App, titleOf } from './App.tsx';
import type { PageData } from './data.ts';

// 2節: 1回で HTML の文字を全部作る
export function render(data: PageData): { html: string; title: string; status: number } {
  const html = renderToString(<App data={data} />);
  // 見つからないページは、HTML の中身だけでなく、ステータスも 404 にする（5節）
  const notFound = data.route.name === 'not-found' || (data.route.name === 'task' && data.task === null);
  return { html, title: titleOf(data), status: notFound ? 404 : 200 };
}

// 6節: 遅いデータを待つ部分だけ後から送る（ストリーミング）
type Stats = { total: number; done: number };

function StatsView({ stats }: { stats: Promise<Stats> }) {
  const s = use(stats); // Promise が終わるまで、いちばん近い <Suspense> の fallback を出す
  return (
    <p>
      全部で {s.total} 件、完了は {s.done} 件です。
    </p>
  );
}

function StatsPage({ stats }: { stats: Promise<Stats> }): ReactNode {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <title>集計</title>
      </head>
      <body>
        <h1>集計（ストリーミング）</h1>
        <p>この行は、すぐに届きます。</p>
        <Suspense fallback={<p>集計中…</p>}>
          <StatsView stats={stats} />
        </Suspense>
        <p>
          <a href="/">一覧へ</a>
        </p>
      </body>
    </html>
  );
}

export function renderStats(stats: Promise<Stats>, out: NodeJS.WritableStream, onError: (e: unknown) => void) {
  const stream = renderToPipeableStream(<StatsPage stats={stats} />, {
    // 「すぐ出せる部分」（fallback を含む）ができたら、送り始める
    onShellReady: () => stream.pipe(out),
    onError,
  });
}
