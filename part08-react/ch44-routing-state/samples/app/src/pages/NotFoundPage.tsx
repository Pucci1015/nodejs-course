// 第44章 2.3節: どのルートにも合わなかったとき（と、無いタスクの id のとき）のページ
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section>
      <h1>ページが見つかりません</h1>
      <p>
        <Link to="/">一覧へ戻る</Link>
      </p>
    </section>
  );
}
