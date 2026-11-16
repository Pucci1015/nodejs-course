// どのページにも出す枠（第44章 2.2節、第45章 5節）
import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useTaskEvents } from './api/queries.ts';
import { AnnouncerProvider } from './components/Announcer.tsx';

export function Layout(): ReactNode {
  useTaskEvents();
  return (
    <AnnouncerProvider>
      <a href="#main" className="skip-link">
        本文へ
      </a>
      <header className="site-header">
        <nav aria-label="メニュー">
          <NavLink to="/" end>
            一覧
          </NavLink>
          <NavLink to="/tasks/new">新しいタスク</NavLink>
        </nav>
      </header>
      <main id="main">
        <Outlet />
      </main>
    </AnnouncerProvider>
  );
}
