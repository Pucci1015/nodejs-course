// 第44章 練習問題2の模範解答
import type { ReactNode } from 'react';
import { NavLink } from 'react-router';

export type NavItem = { to: string; label: string };

export function Nav({ items }: { items: NavItem[] }): ReactNode {
  return (
    <nav aria-label="メニュー">
      <ul>
        {items.map((item) => (
          <li key={item.to}>
            {/* / は、ほかのすべての URL の先頭に合ってしまうので、end で「ぴったりのときだけ」にする */}
            <NavLink to={item.to} end={item.to === '/'} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
