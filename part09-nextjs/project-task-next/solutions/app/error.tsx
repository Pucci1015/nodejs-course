'use client';
// ページを作る途中の失敗（API につながらない など）を受け止める（第47章 6.2節）
// error.message は、本番（next start）では中身を隠した文になる
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div role="alert">
      <h1>うまく表示できませんでした</h1>
      <p>{error instanceof Error ? error.message : '思わぬ失敗です'}</p>
      <button type="button" onClick={retry}>
        もう一度読む
      </button>
    </div>
  );
}
