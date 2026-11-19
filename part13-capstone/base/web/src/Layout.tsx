// どのページにも出す枠（第44章 2.2節、第45章 5節）
// メニューを、ログインしているかで変える
import type { ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useLogout, useMe } from './api/queries.ts';
import { AnnouncerProvider, useAnnounce } from './components/Announcer.tsx';
import { errorMessage } from './lib/errors.ts';

/** ログインしている人のアドレスと、ログアウトのボタン */
function UserMenu({ email }: { email: string | null }): ReactNode {
  const logout = useLogout();
  const navigate = useNavigate();
  const announce = useAnnounce();
  return (
    <p className="user-menu">
      <span>{email ?? '（メールアドレスなし）'}</span>{' '}
      <button
        type="button"
        disabled={logout.isPending}
        onClick={() => {
          logout.mutate(undefined, {
            onSuccess: () => {
              announce('ログアウトしました');
              void navigate('/login');
            },
            onError: (err) => announce(errorMessage(err)),
          });
        }}
      >
        ログアウト
      </button>
    </p>
  );
}

function Menu(): ReactNode {
  const me = useMe();
  if (me.data === undefined) return null; // 読み込み中
  if (me.data === null) {
    return (
      <nav aria-label="メニュー">
        <NavLink to="/login">ログイン</NavLink>
        <NavLink to="/register">登録</NavLink>
      </nav>
    );
  }
  return (
    <>
      <nav aria-label="メニュー">
        <NavLink to="/" end>
          予約
        </NavLink>
      </nav>
      <UserMenu email={me.data.email} />
    </>
  );
}

export function Layout(): ReactNode {
  return (
    <AnnouncerProvider>
      <a href="#main" className="skip-link">
        本文へ
      </a>
      <header className="site-header">
        <Menu />
      </header>
      <main id="main">
        <Outlet />
      </main>
    </AnnouncerProvider>
  );
}
