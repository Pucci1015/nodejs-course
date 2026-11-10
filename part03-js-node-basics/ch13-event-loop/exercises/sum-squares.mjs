// 練習問題1: 重い計算を小分けにして、合間にイベントループへ順番を譲ってください。
// 要件は README と sum-squares.test.mjs にあります。確かめ方: node --test sum-squares.test.mjs

// 1 から n までの2乗の合計（同期。n が大きいと、その間イベントループが止まる）。これは完成しています
export function sumSquares(n) {
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += i * i;
  }
  return sum;
}

// setImmediate で成功する Promise を返す（await すると、タスクの待ち行列に順番を譲れる）
export function nextTask() {
  // ここを書く
}

// sumSquares と同じ計算を、chunk 個ずつに分けて行う。chunk 個計算するたびに nextTask() を await する
export async function sumSquaresAsync(n, chunk = 100_000) {
  // ここを書く
}
