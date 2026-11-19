// 管理者だけのページの枠（第69章 6節）。RequireLogin の中に置く（ログインしている前提）
// 画面で隠すのは使いやすさのため。守っているのは API（管理者でなければ 403）で、画面ではない
import type { ReactNode } from 'react';
import { Outlet } from 'react-router';
import { useMe } from '../api/queries.ts';
import { PageTitle } from './PageTitle.tsx';

export function RequireAdmin(): ReactNode {
  const me = useMe();
  if (me.data?.role !== 'admin')
    return (
      <>
        <PageTitle>管理者だけのページ</PageTitle>
        <p>このページは管理者だけが使えます。</p>
      </>
    );
  return <Outlet />;
}
