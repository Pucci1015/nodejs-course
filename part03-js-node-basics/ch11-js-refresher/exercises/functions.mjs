// 練習問題2: このファイルの関数を完成させてください。要件は README と functions.test.mjs にあります。
// 確かめ方: node --test functions.test.mjs

export function once(fn) {
  // ここを書く
}

export function memoize(fn, { key = (...args) => JSON.stringify(args), maxSize = Infinity } = {}) {
  // ここを書く
}

export function debounce(fn, ms) {
  // ここを書く
}

export function pipe(...fns) {
  // ここを書く
}
