// 第42章 2節: state はスナップショット。まとめて更新・更新関数。3.1節: document.title を合わせる Effect。5.2節: useRef でタイマーの番号を持つ
import { useEffect, useRef, useState } from 'react';

export function Snapshot() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('');
  // 5.2節: タイマーの番号。画面には出さないので state にしない（変えても描き直さない）
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 3.1節: 描画のあと、タブの題名を count に合わせる
  useEffect(() => {
    document.title = `count: ${count}`;
  }, [count]);

  function addThreeWrong() {
    // 3回とも「この描画の count」（たとえば 0）に 1 を足すので、0 + 1 を3回入れるだけ
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  }

  function addThree() {
    // 更新関数: React が「その時点の最新の値」を n に渡してくれる
    setCount((n) => n + 1);
    setCount((n) => n + 1);
    setCount((n) => n + 1);
  }

  function showLater() {
    // 3秒後に動いても、見えるのは「ボタンを押したときの描画」の count
    // 5.2節: 前のタイマーが残っていたら止めてから、新しく始める
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(`押したときの count は ${count}`), 3000);
  }

  console.log('Snapshot を描画', count);
  return (
    <section>
      <h2>count: {count}</h2>
      <button type="button" onClick={addThreeWrong}>+3（まちがい）</button>
      <button type="button" onClick={addThree}>+3</button>
      <button type="button" onClick={showLater}>3秒後に表示</button>
      <p>{message}</p>
    </section>
  );
}
