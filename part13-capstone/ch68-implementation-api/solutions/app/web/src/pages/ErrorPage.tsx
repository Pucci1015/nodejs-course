// 描くときに投げられた失敗を受け止める（第44章 2.3節）。ここに来るのはバグなので、中身は見せない
import type { ReactNode } from 'react';
import { useRouteError } from 'react-router';

export function ErrorPage(): ReactNode {
  console.error(useRouteError());
  return (
    <main>
      <h1>うまく表示できませんでした</h1>
      <p>
        <a href="/">最初のページに戻る</a>
      </p>
    </main>
  );
}
