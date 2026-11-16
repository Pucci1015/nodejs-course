'use client';
// 第48章 2節: ブラウザでも動く部品（Client Component）。state とイベントは、こちらでだけ使える
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  // この console.log は、サーバ（最初の HTML を作るとき）と、ブラウザ（ハイドレーションのとき）の両方で出る
  console.log('Counter を描きました', count);
  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      押した回数: {count}
    </button>
  );
}
