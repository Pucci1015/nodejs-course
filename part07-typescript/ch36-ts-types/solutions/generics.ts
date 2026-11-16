// 練習問題3 の模範解答

export function last<T>(items: T[]): T | undefined {
  return items.at(-1);
}

// K は T の項目の名前のどれか。戻り値は「T の K の項目の型」の配列
export function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

export function groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>(); // 空の Map は、中身の型を <…> で書く
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key); // T[] | undefined
    if (group === undefined) groups.set(key, [item]);
    else group.push(item);
  }
  return groups;
}

export function indexBy<T, K extends keyof T>(items: T[], key: K): Map<T[K], T> {
  const index = new Map<T[K], T>();
  for (const item of items) index.set(item[key], item);
  return index;
}

export function chunk<T>(items: T[], size: number): T[][] {
  if (!Number.isInteger(size) || size < 1) throw new RangeError(`size は 1 以上の整数です: ${size}`);
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
