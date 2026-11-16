// 第42章 練習問題5の模範解答
import { useEffect, useState, type ReactNode } from 'react';

export function Stopwatch(): ReactNode {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    // 更新関数にすると、seconds を依存配列に入れなくてよい（1秒ごとに Effect を作り直さない）
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  return (
    <section>
      <p>経過: {seconds} 秒</p>
      <button type="button" onClick={() => setRunning(!running)}>
        {running ? '停止' : '開始'}
      </button>
      <button
        type="button"
        onClick={() => {
          setRunning(false);
          setSeconds(0);
        }}
      >
        リセット
      </button>
    </section>
  );
}
