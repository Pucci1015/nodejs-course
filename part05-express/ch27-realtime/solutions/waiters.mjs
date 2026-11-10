// 練習問題2 の模範解答
export function createWaiters() {
  const waiting = new Set();
  return {
    add(fn) {
      waiting.add(fn);
      return () => {
        waiting.delete(fn);
      };
    },
    notifyAll(value) {
      const list = [...waiting];
      waiting.clear();
      for (const fn of list) fn(value);
    },
    size() {
      return waiting.size;
    },
  };
}
