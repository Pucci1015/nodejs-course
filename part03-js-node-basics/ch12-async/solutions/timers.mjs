// 練習問題1 の模範解答
export function delay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function delayFail(ms, message) {
  return new Promise((resolve, reject) => setTimeout(() => reject(new Error(message)), ms));
}

export async function valueOr(promise, fallback) {
  try {
    return await promise; // await を付けないと、失敗が try の外で起きる
  } catch {
    return fallback;
  }
}
