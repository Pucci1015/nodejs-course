// 第42章 5節: useRef（DOM を指す・描画に使わない値を持つ）。6節: useMemo で重い計算を覚えておく
import { useMemo, useRef, useState } from 'react';

// 5,000 件のタスク（実験用）
const TASKS = Array.from({ length: 5000 }, (_, i) => ({ id: i + 1, title: `タスク ${i + 1}` }));

// わざと遅くした絞り込み
function slowFilter(query: string) {
  const start = performance.now();
  while (performance.now() - start < 100) {
    // 100ms 何もしない（重い計算のかわり）
  }
  return TASKS.filter((t) => t.title.includes(query)).slice(0, 20);
}

export function SearchBox() {
  const [query, setQuery] = useState('');
  const [dark, setDark] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // query が変わったときだけ計算し直す。dark を切り替えても、前の結果を使う
  const found = useMemo(() => {
    console.log('絞り込み', query);
    return slowFilter(query);
  }, [query]);

  return (
    <section style={{ background: dark ? '#333' : '#fff', color: dark ? '#fff' : '#000' }}>
      <h2>検索</h2>
      <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="検索" />
      <button type="button" onClick={() => inputRef.current?.focus()}>検索欄へ</button>
      <button type="button" onClick={() => setDark(!dark)}>色を変える</button>
      <ul>
        {found.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
    </section>
  );
}
