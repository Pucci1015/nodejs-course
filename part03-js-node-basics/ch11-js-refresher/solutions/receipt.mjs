// 練習問題3 の解答: コピーし忘れの2つのバグを直したレシート
// 使い方: node receipt.mjs
//
// 期待する出力:
//   --- 1枚目（既定の設定）
//   ノート x2  1000円
//   ペン x1  150円
//   消費税 115円
//   合計 1265円
//   --- 2枚目（軽減税率、表記を「お会計」に）
//   ペン x1  150円
//   消費税 12円
//   お会計 162円
//   --- 3枚目（既定の設定に戻る）
//   ノート x2  1000円
//   ペン x1  150円
//   消費税 115円
//   合計 1265円
//   --- 元の items の順番は変わらない
//   ノート, ペン

export const DEFAULT_OPTIONS = { taxRate: 0.1, totalLabel: '合計' };

/**
 * items: [{ name, price, count }] の配列
 * overrides: DEFAULT_OPTIONS のうち、変えたいものだけを入れたオブジェクト
 * 戻り値: レシートの行の配列（商品は名前の順に並べる）
 */
export function makeReceipt(items, overrides = {}) {
  // 直した1: 新しいオブジェクトを作る。DEFAULT_OPTIONS をそのまま使うと、Object.assign で書き換えてしまう
  const options = { ...DEFAULT_OPTIONS, ...overrides };

  // 直した2: toSorted は新しい配列を返す。sort だと、呼んだ側の items まで並び変わる
  const sorted = items.toSorted((a, b) => a.name.localeCompare(b.name, 'ja'));
  const lines = [];
  let subtotal = 0;
  for (const item of sorted) {
    const amount = item.price * item.count;
    subtotal += amount;
    lines.push(`${item.name} x${item.count}  ${amount}円`);
  }
  const tax = Math.floor(subtotal * options.taxRate);
  lines.push(`消費税 ${tax}円`);
  lines.push(`${options.totalLabel} ${subtotal + tax}円`);
  return lines;
}

// node receipt.mjs で実行したときだけ、下を動かす（テストから import したときは動かさない）
if (import.meta.main) {
  const items = [
    { name: 'ペン', price: 150, count: 1 },
    { name: 'ノート', price: 500, count: 2 },
  ];
  console.log('--- 1枚目（既定の設定）');
  console.log(makeReceipt(items).join('\n'));
  console.log('--- 2枚目（軽減税率、表記を「お会計」に）');
  console.log(makeReceipt([items[0]], { taxRate: 0.08, totalLabel: 'お会計' }).join('\n'));
  console.log('--- 3枚目（既定の設定に戻る）');
  console.log(makeReceipt(items).join('\n'));
  console.log('--- 元の items の順番は変わらない');
  console.log(items.map((i) => i.name).join(', '));
}
