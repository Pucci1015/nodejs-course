// 練習問題3: 値段をまとめて問い合わせる関数を3つ作ってください。
// 要件は README と prices.test.mjs にあります。確かめ方: node --test prices.test.mjs
//
// getPrice(id) は、値段を問い合わせる関数です（練習問題2と同じ）。Promise を返し、失敗することもあります。

// ids の順に1つずつ問い合わせ（前のものが終わってから次を始める）、値段の配列を返す
export async function getPricesSerial(ids, getPrice) {
  // ここを書く
}

// 全部を同時に問い合わせ、値段の配列を返す（順番は ids の順）
export async function getPricesParallel(ids, getPrice) {
  // ここを書く
}

// 全部を同時に問い合わせ、成功したものと失敗したものに分けて返す
//   例: { prices: { apple: 120, milk: 300 }, failed: ['cake'] }
export async function getPricesSettled(ids, getPrice) {
  // ここを書く
}
