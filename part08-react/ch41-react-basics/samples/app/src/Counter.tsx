// 第41章 6.1節: はじめての state
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <p>
      <button onClick={() => setCount(count + 1)}>押した回数: {count}</button>
    </p>
  );
}
