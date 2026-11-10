// 練習問題1 の模範解答
export function sumSquares(n) {
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += i * i;
  }
  return sum;
}

export function nextTask() {
  return new Promise((resolve) => setImmediate(resolve));
}

export async function sumSquaresAsync(n, chunk = 100_000) {
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += i * i;
    if (i % chunk === 0) {
      await nextTask(); // chunk 個ごとに譲る
    }
  }
  return sum;
}
