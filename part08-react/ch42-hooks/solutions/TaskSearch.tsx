// 第42章 練習問題8の模範解答
import { useEffect, useRef, useState, type ReactNode } from 'react';

export function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    // value が ms の間変わらなければ、反映する。その前に変わったら、後片付けでタイマーを止める
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

type Task = { id: number; title: string };

export function TaskSearch({ tasks }: { tasks: Task[] }): ReactNode {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '/') return;
      // 入力欄の中で打った / は、文字として入れる
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const q = debounced.trim().toLowerCase();
  const found = tasks.filter((t) => t.title.toLowerCase().includes(q));

  return (
    <section>
      <input
        ref={inputRef}
        aria-label="検索"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setQuery('');
        }}
      />
      <p>{found.length} 件</p>
      <ul>
        {found.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
    </section>
  );
}
