// 練習問題3 の模範解答。直した所に「修正」のコメントを付けた

export type Item = { name: string; price: number; qty: number };

/** 品物の合計の金額 */
export function total(items: Item[]): number {
  let sum = 0; // 修正: '0'（文字列）だと += が文字列をつなげてしまう。数の 0 から始める
  for (const it of items) sum += it.price * it.qty;
  return sum;
}

/** いちばん安い品物の名前。品物が無ければ '（なし）' */
export function cheapest(items: Item[]): string {
  const sorted = items.toSorted((a, b) => a.price - b.price);
  return sorted[0]?.name ?? '（なし）'; // 修正: 空の配列なら sorted[0] は undefined
}

/** 名前で品物を探す。無ければ undefined */
export function findItem(items: Item[], name: string): Item | undefined {
  // 修正: 戻り値に | undefined を足し、nmae を name に
  return items.find((it) => it.name === name);
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

export const SALE_PRICE = discount(1000, 0.1); // 修正: '1000'（文字列）ではなく数を渡す
