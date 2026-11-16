// 練習問題1: Redis のコマンドを使う、小さな関数を4つ書いてください。
// 要件は README にあります。
// 確かめ方: node --test kv.test.mjs

// value を JSON の文字列にして key に入れる。ttlSec（秒）が渡されたら、その秒数で消えるようにする
export async function setJson(redis, key, value, ttlSec) {
  // ここを書く
}

// key の JSON を読んで、元の値に戻して返す。無ければ undefined
export async function getJson(redis, key) {
  // ここを書く
}

// key の数を 1 増やし、増やした後の数（number）を返す。無ければ 1
export async function countUp(redis, key) {
  // ここを書く
}

// key が消えるまでの秒数。期限が無ければ Infinity、key が無ければ null
export async function secondsLeft(redis, key) {
  // ここを書く
}
