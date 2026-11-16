// 練習問題2: cache-aside の形で読む関数 cached を書いてください。
// 要件は README にあります。
// 確かめ方: node --test cached.test.mjs

// key にキャッシュがあれば、それを返す（loader は呼ばない）。
// 無ければ loader() を呼んで値を作り、ttlSec 秒のキャッシュにしてから返す
export async function cached(redis, key, ttlSec, loader) {
  // ここを書く
}
