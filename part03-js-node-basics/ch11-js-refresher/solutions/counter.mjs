// 練習問題1 の解答: start と step を指定できるカウンタ
export function makeCounter(start = 0, step = 1) {
  let count = start; // 外からは見えない。返した関数だけが読み書きできる
  return {
    increment: () => {
      count = count + step;
      return count;
    },
    decrement: () => {
      count = count - step;
      return count;
    },
    reset: () => {
      count = start;
      return count;
    },
    get: () => count,
  };
}
