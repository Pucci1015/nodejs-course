// node --test の練習で確かめる関数（第7章 8節）
export function sum(numbers) {
  let total = 0;
  for (const n of numbers) {
    total += n;
  }
  return total;
}
