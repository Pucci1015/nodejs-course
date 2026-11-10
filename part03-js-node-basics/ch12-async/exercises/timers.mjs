// 練習問題1: Promise を返す関数を3つ作ってください。
// 要件は README と timers.test.mjs にあります。確かめ方: node --test timers.test.mjs

// ms ミリ秒たったら、value で成功する Promise を返す
export function delay(ms, value) {
  // ここを書く
}

// ms ミリ秒たったら、new Error(message) で失敗する Promise を返す
export function delayFail(ms, message) {
  // ここを書く
}

// promise を待って、その値を返す。promise が失敗したら、fallback を返す（失敗を外に出さない）
export async function valueOr(promise, fallback) {
  // ここを書く
}
