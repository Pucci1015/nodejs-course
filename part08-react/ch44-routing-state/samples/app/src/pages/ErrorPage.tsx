// 第44章 2.3節: ページを描いている途中で投げられたエラーを受け止めるページ
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

export function ErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : String(error);
  return (
    <section role="alert">
      <h1>問題が起きました</h1>
      <p>{message}</p>
      <Link to="/">一覧へ戻る</Link>
    </section>
  );
}
