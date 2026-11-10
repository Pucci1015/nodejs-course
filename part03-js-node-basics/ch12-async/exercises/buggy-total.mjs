// 練習問題2: 商品の値段を1つずつ問い合わせて、合計を出す関数です。バグがあります。
// cp buggy-total.mjs total.mjs でコピーしてから、total.mjs を直してください。
// 確かめ方: node buggy-total.mjs（実行してみる）、node --test total.test.mjs（テスト）
//
// 期待する出力:
//   合計: 650 円
//
// getPrice(id) は、値段を問い合わせる関数です（本物なら HTTP の API）。
// 少し時間がかかり、Promise を返します。

export async function totalPrice(ids, getPrice) {
  let total = 0;
  ids.forEach(async (id) => {
    const price = await getPrice(id);
    total += price;
  });
  return total;
}

// node buggy-total.mjs のように、このファイルを直接実行したときだけ動く（テストから読み込んだときは動かない）
if (import.meta.main) {
  const prices = { apple: 120, bread: 230, milk: 300 };
  const getPrice = (id) => new Promise((resolve) => setTimeout(() => resolve(prices[id]), 100));
  const total = await totalPrice(['apple', 'bread', 'milk'], getPrice);
  console.log(`合計: ${total} 円`);
}
