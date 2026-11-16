'use client';
// 第48章 練習問題3の模範解答: 押すと答えが見える部品。答え（children）はサーバで作ったものでもよい
import { useId, useState, type ReactNode } from 'react';

export function Spoiler({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        {open ? '答えを隠す' : '答えを見る'}
      </button>
      <div id={id} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
