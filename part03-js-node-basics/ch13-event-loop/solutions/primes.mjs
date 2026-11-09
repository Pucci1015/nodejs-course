// 重い計算の例: from 以上 to 以下の素数を数える（わざと素朴なやり方で、時間がかかるようにしている）
export function countPrimes(from, to) {
  let count = 0;
  for (let n = Math.max(2, from); n <= to; n++) {
    let prime = true;
    for (let d = 2; d * d <= n; d++) {
      if (n % d === 0) {
        prime = false;
        break;
      }
    }
    if (prime) count++;
  }
  return count;
}
