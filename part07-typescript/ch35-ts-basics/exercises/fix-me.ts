// 練習問題3: このファイルには、型のエラーが5つあります。どれも、動かすと困る本当のバグです。
// tsc のエラーを読んで、5つとも直してください。使ってはいけない書き方が README にあります。
// 確かめ方: node --test fix-me.test.ts

export type Item = { name: string; price: number; qty: number };

/** 品物の合計の金額 */
export function total(items: Item[]): number {
  let sum = '0';
  for (const it of items) sum += it.price * it.qty;
  return sum;
}

/** いちばん安い品物の名前。品物が無ければ '（なし）' */
export function cheapest(items: Item[]): string {
  const sorted = items.toSorted((a, b) => a.price - b.price);
  return sorted[0].name;
}

/** 名前で品物を探す。無ければ undefined */
export function findItem(items: Item[], name: string): Item {
  return items.find((it) => it.nmae === name);
}

/** レシートの文字列 */
export function receipt(items: Item[]): string {
  const lines = items.map((it) => `${it.name} x${it.qty}`);
  lines.push(`合計 ${total(items)}円`);
  return lines.join('\n');
}

/** 割り引いた値段（四捨五入） */
export function discount(price: number, rate: number): number {
  return Math.round(price * (1 - rate));
}

export const SALE_PRICE = discount('1000', 0.1);
