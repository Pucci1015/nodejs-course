// ミュータント: 呼ばれても待ち直さない（最初の呼び出しから ms 後に動く）
export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  cancel(): void;
  flush(): void;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: A | undefined; // 待っている呼び出しの引数

  const run = () => {
    clearTimeout(timer);
    timer = undefined;
    if (pending === undefined) return;
    const args = pending;
    pending = undefined;
    fn(...args);
  };

  const debounced = (...args: A) => {
    pending = args;
    if (timer === undefined) timer = setTimeout(run, ms);
  };
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    pending = undefined;
  };
  debounced.flush = run;
  return debounced;
}
