// 練習問題3: 重い処理を小分けにして、合間にイベントループへ順番を譲る processInChunks を作ってください。
// 要件は README と chunked.test.mjs にあります。
// 確かめ方: node --test chunked.test.mjs

/**
 * items の各要素に、同期の関数 fn(item, index) を順番に適用し、結果の配列を返す。
 * ただし、続けて budgetMs ミリ秒以上 CPU を使ったら、いったんイベントループに順番を譲る。
 * @param {Iterable<any>} items
 * @param {(item: any, index: number) => any} fn
 * @param {{ budgetMs?: number, signal?: AbortSignal }} [options]
 * @returns {Promise<any[]>}
 */
export async function processInChunks(items, fn, { budgetMs = 10, signal } = {}) {
  // ここを書く
}
