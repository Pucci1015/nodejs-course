// 第56章 5.3節: 最後に呼ばれてから ms ミリ秒たったら、1回だけ fn を呼ぶ（第3部 第11章の debounce）

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A): void => {
    clearTimeout(timer); // 前の予約を取り消して、
    timer = setTimeout(() => fn(...args), ms); // 新しく予約し直す
  };
}
