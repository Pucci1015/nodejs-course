'use client';
// 第48章 3.2節: 開け閉めはブラウザで。中身（children）は、サーバで作ったものをそのまま受け取る
import { useId, useState, type ReactNode } from 'react';

export function Collapsible({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section>
      <h2>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          {open ? '▼' : '▶'} {title}
        </button>
      </h2>
      <div id={id} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
