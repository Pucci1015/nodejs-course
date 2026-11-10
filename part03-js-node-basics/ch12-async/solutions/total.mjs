// 練習問題2 の模範解答
export async function totalPrice(ids, getPrice) {
  let total = 0;
  for (const id of ids) {
    const price = await getPrice(id); // 1つ終わるのを待ってから、次へ
    total += price;
  }
  return total;
}

if (import.meta.main) {
  const prices = { apple: 120, bread: 230, milk: 300 };
  const getPrice = (id) => new Promise((resolve) => setTimeout(() => resolve(prices[id]), 100));
  const total = await totalPrice(['apple', 'bread', 'milk'], getPrice);
  console.log(`合計: ${total} 円`);
}
