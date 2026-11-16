// 練習問題7: 失敗を戻り値で返す Result 型と、それを使う関数を書いてください。要件は README にあります。
// as と any は使わず、throw もしません。
// 確かめ方: node --test result.test.ts

// ここに export type Result<T, E = string> = ... を書く

export function ok(value) {
  throw new Error('まだ書いていません');
}

export function err(error) {
  throw new Error('まだ書いていません');
}

export function parseLimit(text) {
  throw new Error('まだ書いていません');
}

export function parseDueDate(text) {
  throw new Error('まだ書いていません');
}

export function parseNewTask(input) {
  throw new Error('まだ書いていません');
}

export function unwrapOr(result, fallback) {
  throw new Error('まだ書いていません');
}
