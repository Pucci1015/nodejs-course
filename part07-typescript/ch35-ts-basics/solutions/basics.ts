// 練習問題1 の模範解答
export function add(a: number, b: number): number {
  return a + b;
}

export function average(nums: number[]): number {
  if (nums.length === 0) return 0; // 0 で割ると NaN になるので、先に返す
  let sum = 0;
  for (const n of nums) sum += n;
  return sum / nums.length;
}

export function formatPrice(yen: number, withTax?: boolean): string {
  return withTax ? `${Math.round(yen * 1.1)}円（税込）` : `${yen}円`;
}

export function line(char: string, width = 10): string {
  return char.repeat(width);
}
