'use client';
// 第47章 6節: ページを作る途中で投げられた失敗を受け止める。ボタンを押せるように、ブラウザでも動く部品にする（'use client'。第48章）
// error.message は、開発中は元の文、本番（next start）では中身を隠した文になる（秘密が画面に出ないように）
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div role="alert">
      <h1>うまく表示できませんでした</h1>
      {/* 投げられたものが Error とは限らないので、確かめてから message を読む（第36章 3節） */}
      <p>{error instanceof Error ? error.message : '思わぬ失敗です'}</p>
      <button type="button" onClick={retry}>
        もう一度読む
      </button>
    </div>
  );
}
