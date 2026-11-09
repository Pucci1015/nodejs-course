// 練習問題3 の解答: 重い処理を小分けにして、合間にイベントループへ順番を譲る
// 確かめ方: cd ../exercises && MODULE=../solutions/chunked.mjs node --test chunked.test.mjs

/** イベントループに順番を譲る。タイマーや I/O のコールバックが先に動ける */
const yieldToEventLoop = () => new Promise((resolve) => setImmediate(resolve));
// 注意: await Promise.resolve() や queueMicrotask では譲ったことにならない。
//       マイクロタスクは、タイマーや I/O より先に、すべて片付けられてしまうため（本文 2節）

export async function processInChunks(items, fn, { budgetMs = 10, signal } = {}) {
  // 最初にも1回譲る。こうすると「呼んだ時点では処理しない」が守られ、呼んだ側の同期の処理が先に終わる
  await yieldToEventLoop();
  signal?.throwIfAborted();

  const results = [];
  let index = 0;
  let sliceStart = performance.now();
  for (const item of items) {
    results.push(fn(item, index++)); // 例外はそのまま投げる（async 関数なので rejected になる）

    if (performance.now() - sliceStart >= budgetMs) {
      await yieldToEventLoop();
      signal?.throwIfAborted(); // 譲っている間に中止されたかもしれない
      sliceStart = performance.now();
    }
  }
  return results;
}
