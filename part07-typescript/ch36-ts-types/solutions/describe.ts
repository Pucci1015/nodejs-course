// 練習問題1 の模範解答
export function describe(value: string | number | boolean | string[] | Date | null | undefined): string {
  // == null は「null か undefined」。この教材では、はっきり2つ書く
  if (value === null || value === undefined) return '（なし）';
  if (typeof value === 'string') return `文字列「${value}」（${value.length}文字）`;
  if (typeof value === 'number') return Number.isInteger(value) ? `整数 ${value}` : `小数 ${value}`;
  if (typeof value === 'boolean') return value ? 'はい' : 'いいえ';
  if (Array.isArray(value)) return value.length === 0 ? '0個' : `${value.length}個: ${value.join(', ')}`;
  // 残りは Date だけ
  return `日付 ${value.toISOString().slice(0, 10)}`;
}
