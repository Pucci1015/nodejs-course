// 第41章 練習問題5の模範解答: − と + で数を変える。端ではボタンを押せない
import { useState } from 'react';

type Props = { min?: number; max?: number; initial?: number; label: string };

export function Stepper({ min = 0, max = 10, initial = min, label }: Props) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <button type="button" aria-label={`${label}を減らす`} disabled={value <= min} onClick={() => setValue(value - 1)}>
        −
      </button>
      <output aria-label={label}>{value}</output>
      <button type="button" aria-label={`${label}を増やす`} disabled={value >= max} onClick={() => setValue(value + 1)}>
        +
      </button>
    </div>
  );
}
