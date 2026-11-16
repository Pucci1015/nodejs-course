// 練習問題7: Redis の Pub/Sub で、プロセスの間に知らせ（オブジェクト）を配る部品を書いてください。
// 要件は README にあります。
// 確かめ方: node --test broadcaster.test.mjs

export function createBroadcaster(redis, channel) {
  return {
    // event を JSON にして channel に配る。受け取った接続の数を返す
    async publish(event) {
      // ここを書く
    },
    // channel に来た知らせを、オブジェクトに戻して handler(event) に渡す。止める関数（async）を返す
    async subscribe(handler) {
      // ここを書く
    },
  };
}
