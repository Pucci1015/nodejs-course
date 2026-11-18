// どの URL にも合わないとき
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PageTitle } from '../components/PageTitle.tsx';

export function NotFoundPage(): ReactNode {
  return (
    <>
      <PageTitle>ページが見つかりません</PageTitle>
      <p>
        <Link to="/">一覧に戻る</Link>
      </p>
    </>
  );
}
