// 練習問題6 で確かめる関数（正しい実装）。書き換えないでください
// 最後に呼ばれてから ms ミリ秒たったら、最後の引数で1回だけ fn を呼ぶ
//   cancel(): 待っている呼び出しを取り消す
//   flush():  待っている呼び出しがあれば、待たずに今すぐ呼ぶ（無ければ何もしない）

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
    clearTimeout(timer);
    timer = setTimeout(run, ms);
  };
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    pending = undefined;
  };
  debounced.flush = run;
  return debounced;
}
