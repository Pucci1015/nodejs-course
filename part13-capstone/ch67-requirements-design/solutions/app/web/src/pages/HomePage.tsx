// ログインした後の最初のページ（土台）。第69章で、その日の予約の表に作り替える
import type { ReactNode } from 'react';
import { useMe } from '../api/queries.ts';
import { PageTitle } from '../components/PageTitle.tsx';

export function HomePage(): ReactNode {
  const me = useMe();
  return (
    <>
      <PageTitle>会議室の予約</PageTitle>
      <p>ようこそ、{me.data?.email ?? ''} さん。</p>
      <p>ここに、その日の会議室の予約の表を作ります。</p>
    </>
  );
}
