// 第44章 2.2節: どのページにも出す枠。ページの中身は <Outlet /> の場所に入る
import { NavLink, Outlet } from 'react-router';
import { useSettings } from './settings.tsx';

export function Layout() {
  const { settings, update } = useSettings();
  return (
    <div className={settings.dark ? 'dark' : undefined} style={{ background: settings.dark ? '#222' : '#fff', color: settings.dark ? '#eee' : '#000', minHeight: '100vh' }}>
      <header>
        <nav>
          {/* NavLink は、今のページへのリンクに aria-current="page" を付ける */}
          <NavLink to="/" end>一覧</NavLink> | <NavLink to="/tasks/new">新しいタスク</NavLink> | <NavLink to="/about">この画面について</NavLink>
        </nav>
        <label>
          <input type="checkbox" checked={settings.dark} onChange={(e) => update({ dark: e.target.checked })} /> 暗い色
        </label>{' '}
        <label>
          <input type="checkbox" checked={settings.compact} onChange={(e) => update({ compact: e.target.checked })} /> 詰めて表示
        </label>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
