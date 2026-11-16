// 第42章 練習問題1の模範解答
import { useState, type ReactNode } from 'react';

export function Score(): ReactNode {
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState<string[]>([]);

  function add(n: number) {
    // 更新関数: 前の値から次の値を作る。同じ描画の中で何回呼んでも、正しく足される
    setScore((s) => s + n);
    // 配列は push せず、新しい配列を作る
    setHistory((h) => [...h, `+${n}`]);
  }

  function addOne() {
    add(1);
  }

  return (
    <section>
      <h2>得点: {score}</h2>
      <button type="button" onClick={addOne}>+1</button>
      <button
        type="button"
        onClick={() => {
          addOne();
          addOne();
          addOne();
        }}
      >
        +3
      </button>
      <button
        type="button"
        onClick={() => {
          setScore(0);
          setHistory((h) => [...h, '0に戻す']);
        }}
      >
        0に戻す
      </button>
      <ol>
        {history.map((h, i) => (
          // 履歴は足すだけで、並べ替えも削除もしないので、番号を key にしてよい
          <li key={i}>{h}</li>
        ))}
      </ol>
    </section>
  );
}
