// ログインが要るページの枠。ログインしていなければ、ログインのページへ（戻り先を ?next= に付ける）
// 画面で隠すのは使いやすさのため。守っているのは API（ログインしていなければ 401）で、画面ではない
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useMe } from '../api/queries.ts';
import { errorMessage } from '../lib/errors.ts';

export function RequireLogin(): ReactNode {
  const me = useMe();
  const { pathname, search } = useLocation();
  if (me.isPending) return <p>読み込み中…</p>;
  if (me.isError) return <p role="alert">{errorMessage(me.error)}</p>;
  if (me.data === null) return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
  return <Outlet />;
}
