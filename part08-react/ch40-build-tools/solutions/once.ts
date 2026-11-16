// 第40章 練習問題5の模範解答: 読み込みを1回だけにする（import() と一緒に使う）

/**
 * loader を初めて呼ばれたときだけ動かし、同じ Promise を返し続ける。失敗したら覚えず、次に呼ばれたときにやり直す
 */
export function once<T>(loader: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => {
    pending ??= loader().catch((err: unknown) => {
      pending = undefined;
      throw err;
    });
    return pending;
  };
}
