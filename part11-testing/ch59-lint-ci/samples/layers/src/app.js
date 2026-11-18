// 第59章 2.4節: アプリのコード（console.log を使ってはいけない）
export function total(prices) {
  console.log('合計を計算します');
  return prices.reduce((sum, price) => sum + price, 0);
}
